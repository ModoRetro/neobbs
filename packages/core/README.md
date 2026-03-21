# @neobbs/core

Core engine for building modular, interactive terminal applications.

Part of the [neobbs](https://github.com/ModoRetro/neobbs) project.

## Installation

```bash
npm install @neobbs/core
```

## Basic Example

```js
const Engine = require('@neobbs/core');
const { createMenu, createFlow } = require('@neobbs/core');

const engine = new Engine();

engine.registerRoute('home', (session) => {
  session.send({ type: 'header', title: 'My App' });
  session.send('Hello, ' + session.user.username);
  session.send({ type: 'footer' });
});

const session = engine.createSession({
  user: { username: 'alice', permissions: [] },
});

engine.navigate(session, 'home');
```

## Concepts

### Engine

The central runtime. Holds routes, services, permissions, and event listeners. Everything connects through it.

```js
const engine = new Engine();
```

### Plugins

A plugin is a plain function that receives the engine and registers routes, services, and permissions. This is the primary extension mechanism.

```js
function myPlugin(engine) {
  engine.registerPermission('myapp:item:read');
  engine.registerRoute('myapp', (session) => {
    session.send('Hello from myapp');
  });
}

engine.use(myPlugin);
```

### Routes

Named handlers that receive a session and produce output via `session.send()`.

```js
engine.registerRoute('home', (session) => {
  session.send('Welcome!');
});

engine.navigate(session, 'home');
```

### Sessions

Represent a connected user. Hold identity, state, navigation history, and I/O channels.

```js
const session = engine.createSession({
  user: { username: 'alice', permissions: ['app:read'] },
  _out: (msg) => myRenderer.render(msg),  // plug in your renderer
});
```

Session fields:

| Field | Description |
|---|---|
| `id` | Auto-incremented integer |
| `user` | `{ username, permissions[] }` or `null` |
| `state` | Per-session mutable store |
| `currentRoute` | Active route name |
| `history` | Previously visited routes |
| `send(msg)` | Send a string or message object |
| `onInput(fn)` | Register an input handler |
| `clearInput()` | Remove all input handlers |
| `goBack()` | Navigate to the previous route |

### Permissions

Declared by plugins, checked in services and menus.

```js
engine.registerPermission('blog:post:create');
engine.hasPermission(session.user, 'blog:post:create'); // → true/false
```

Format: `domain:resource:action`

### Navigation

```js
engine.navigate(session, 'blog');  // pushes current route to history
session.goBack();                  // pops and returns to previous route
```

## Events

```js
engine.on('route:enter', ({ session, route }) => { /* ... */ });
engine.on('route:after', ({ session, route }) => { /* ... */ });
engine.on('error',       ({ session, route, error }) => { /* ... */ });
```

## Services

```js
engine.registerService('myService', { doThing() { /* ... */ } });
engine.getService('myService').doThing();
```

## Helpers

### createMenu

```js
const { createMenu } = require('@neobbs/core');

createMenu(engine, session, {
  title: 'Choose:',
  options: [
    { key: '1', label: 'Blog',  route: 'blog' },
    { key: '2', label: 'Admin', route: 'admin', permission: 'system:admin:access' },
  ],
});
```

Options with a `permission` field are only shown to users who have that permission. `[0] Back` is added automatically when history is non-empty.

### createFlow

Multi-step input flow helper.

```js
const { createFlow } = require('@neobbs/core');

createFlow(session, [
  {
    prompt: 'Enter title:',
    validate: (input) => input ? null : 'Title cannot be empty.',
    next: (session, input) => { session.state.title = input; },
  },
  {
    prompt: 'Enter content:',
    validate: (input) => input ? null : 'Content cannot be empty.',
    next: (session, input) => {
      saveItem(session.state.title, input);
      engine.navigate(session, 'list');
    },
  },
]);
```

Each step renders its prompt, registers an input handler, validates, and advances automatically on success. On validation failure, the error is shown and the prompt is re-rendered.

## License

MIT — see [LICENSE](../../LICENSE)
