'use strict';

let nextSessionId = 1;

function normalizeMessage(msg) {
  if (typeof msg === 'string') return { type: 'text', content: msg };
  return msg;
}

class Engine {
  constructor() {
    this._routes = new Map();
    this._permissions = new Set();
    this._listeners = new Map();
    this._services = new Map();
  }

  use(plugin) {
    plugin(this);
    return this;
  }

  registerRoute(name, handler) {
    this._routes.set(name, handler);
    return this;
  }

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(handler);
    return this;
  }

  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (handlers) handlers.forEach((fn) => fn(payload));
  }

  _dispatch(session, name, pushHistory) {
    const handler = this._routes.get(name);
    if (!handler) throw new Error(`Route not found: ${name}`);
    if (pushHistory && session.currentRoute !== null) {
      session.history.push(session.currentRoute);
    }
    session.currentRoute = name;
    session.goBack = () => {
      const prev = session.history.pop();
      if (prev) this._dispatch(session, prev, false);
    };
    session.send({ type: 'clear' });
    this.emit('route:enter', { session, route: name });
    try {
      handler(session);
      this.emit('route:after', { session, route: name });
    } catch (err) {
      this.emit('error', { session, route: name, error: err });
    }
  }

  navigate(session, name) {
    this._dispatch(session, name, true);
  }

  createSession(overrides = {}) {
    return {
      id: nextSessionId++,
      user: null,
      state: {},
      currentRoute: null,
      history: [],
      goBack() {},
      _out: (message) => {
        if (message.type === "text") {
          process.stdout.write(message.content + '\n');
        } else {
          process.stdout.write('[message] ' + JSON.stringify(message) + '\n');
        }
      },
      send(msg) { this._out(normalizeMessage(msg)); },
      _inputHandlers: [],
      onInput(handler) { this._inputHandlers.push(handler); },
      clearInput() { this._inputHandlers = []; },
      _input(data) { this._inputHandlers.forEach((fn) => fn(data)); },
      ...overrides,
    };
  }

  registerService(name, service) {
    if (this._services.has(name)) {
      throw new Error(`Service already registered: ${name}`);
    }
    this._services.set(name, service);
    return this;
  }

  getService(name) {
    if (!this._services.has(name)) throw new Error(`Service not found: ${name}`);
    return this._services.get(name);
  }

  registerPermission(permission) {
    this._permissions.add(permission);
    return this;
  }

  hasPermission(user, permission) {
    if (!this._permissions.has(permission)) return false;
    if (!user || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permission);
  }
}

function createMenu(engine, session, { title, options }) {
  const allowed = options.filter((opt) =>
    !opt.permission || engine.hasPermission(session.user, opt.permission)
  );

  session.clearInput();
  session.send(title);
  allowed.forEach((opt) => session.send('[' + opt.key + '] ' + opt.label));
  if (session.history.length > 0) session.send('[0] Back');

  session.onInput((data) => {
    const choice = data.trim();
    if (choice === '0' && session.history.length > 0) {
      session.goBack();
      return;
    }
    const opt = allowed.find((o) => o.key === choice);
    if (opt) {
      engine.navigate(session, opt.route);
    } else {
      session.send('Invalid option: ' + choice);
    }
  });
}

function createFlow(session, steps) {
  function renderPrompt(step) {
    if (typeof step.prompt === 'function') {
      step.prompt(session);
    } else {
      session.send(step.prompt);
    }
    session.send({ type: 'footer' });
  }

  function runStep(i) {
    if (i >= steps.length) return;
    const step = steps[i];
    session.clearInput();
    renderPrompt(step);

    session.onInput((data) => {
      const input = data.trim();
      if (step.validate) {
        const error = step.validate(input);
        if (error) {
          session.send(error);
          renderPrompt(step);
          return;
        }
      }
      step.next(session, input);
      runStep(i + 1);
    });
  }
  runStep(0);
}

module.exports = Engine;
module.exports.createMenu = createMenu;
module.exports.createFlow = createFlow;
