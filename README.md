# neobbs

A modular engine for building multi-user terminal applications — BBS-style systems — over SSH and other interfaces.

neobbs is not a UI library and not a CLI tool. It is a **runtime and plugin platform**: a foundation that multiple apps (blog, forum, chat, games) can be built on top of, sharing a common engine, session model, permission system, and renderer.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Monorepo Structure](#monorepo-structure)
- [Core Concepts](#core-concepts)
  - [Engine](#engine)
  - [Plugins](#plugins)
  - [Routes](#routes)
  - [Sessions](#sessions)
  - [Services & Repositories](#services--repositories)
  - [Permissions](#permissions)
  - [Messages & Renderer](#messages--renderer)
  - [Input System](#input-system)
  - [Navigation & History](#navigation--history)
  - [Menu System](#menu-system)
- [Core API](#core-api)
- [Plugin API](#plugin-api)
- [Message Types](#message-types)
- [Renderer](#renderer)
- [Example: Wiring Everything Together](#example-wiring-everything-together)
- [Current Features](#current-features)
- [Roadmap](#roadmap)

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Engine                      │
│  routes · services · permissions · events   │
└────────────┬──────────────┬─────────────────┘
             │              │
        Plugins          Sessions
     (blog, forum)    (per-connection)
             │              │
         Services        Renderer
        (business       (terminal,
          logic)          web, …)
             │
        Repositories
        (data layer)
```

Business logic flows downward through layers. Each layer has a single responsibility and does not depend on the layers above it.

---

## Monorepo Structure

The project uses **npm workspaces**.

```
neobbs/
  package.json                  ← workspace root

  packages/
    core/                       ← @neobbs/core
    app-blog/                   ← @neobbs/app-blog
    app-forum/                  ← @neobbs/app-forum
    renderer-terminal/          ← @neobbs/renderer-terminal

  examples/
    basic/                      ← runnable demo
```

Install all packages from the root:

```bash
npm install
```

Run the example:

```bash
node examples/basic/index.js
```

### Packages

| Package | Description |
|---|---|
| `@neobbs/core` | Engine, session model, plugin system, routing, permissions, events, menu helper |
| `@neobbs/app-blog` | Blog plugin — posts service, repository, routes |
| `@neobbs/app-forum` | Forum plugin — topics service, repository, routes |
| `@neobbs/renderer-terminal` | Terminal renderer — handles messages, views, layout |
| `examples/basic` | Full wiring demo with login, menus, and both plugins |

---

## Core Concepts

### Engine

The engine is the central runtime. It holds routes, services, permissions, and event listeners. Everything else connects through it.

```js
const Engine = require('@neobbs/core');
const engine = new Engine();
```

### Plugins

A plugin is a plain function that receives the engine and registers its own routes, services, and permissions. Plugins are the primary extension mechanism.

```js
function myPlugin(engine) {
  engine.registerPermission('myapp:item:read');
  engine.registerService('myapp', { ... });
  engine.registerRoute('myapp', (session) => { ... });
}

engine.use(myPlugin);
```

Rules:
- Plugins receive the engine instance
- Plugins must not depend on a specific renderer or transport
- Plugins declare their own permissions

### Routes

Routes are named handlers that receive a session and produce output.

```js
engine.registerRoute('home', (session) => {
  session.send('Welcome!');
});

engine.navigate(session, 'home');
```

Routes are UI-agnostic — they emit messages through the session, not directly to a terminal.

### Sessions

A session represents one connected user. It holds identity, state, navigation history, and the output/input channels.

```js
const session = engine.createSession({
  user: { username: 'alice', permissions: ['blog:post:read'] },
  _out: (msg) => renderer.render(msg),
});
```

**Session shape:**

| Field | Description |
|---|---|
| `id` | Auto-incremented integer |
| `user` | Current user object (`{ username, permissions }`) or `null` |
| `state` | Mutable per-session key/value store |
| `currentRoute` | Name of the active route |
| `history` | Array of previously visited routes |
| `send(msg)` | Send a message (string or object) |
| `onInput(fn)` | Register an input handler |
| `clearInput()` | Remove all input handlers |
| `goBack()` | Navigate to the previous route |
| `_out(msg)` | Internal output function — replace to plug in a renderer |
| `_input(data)` | Called by the transport/renderer to deliver user input |

### Services & Repositories

**Services** hold business logic. They are registered by plugins and retrieved by routes.

```js
engine.registerService('blog', {
  listPosts() { ... },
  createPost(session, title) { ... },
});

// Inside a route:
const blog = engine.getService('blog');
blog.listPosts();
```

**Repositories** handle data storage. They are created by plugins and registered as services, but contain no business logic or permission checks.

```js
// postRepo.js
function createPostRepo() {
  const posts = [];
  return {
    createPost(title) { posts.push({ title }); },
    listPosts() { return posts; },
  };
}
```

```js
// plugin registration
engine.registerService('blog:repo', createPostRepo());
```

The service calls the repository; the route calls the service. Each layer stays thin.

```
Route → Service (permissions + logic) → Repository (storage)
```

### Permissions

Permissions follow a structured format: `domain:resource:action`.

```
blog:post:read
blog:post:create
forum:topic:create
system:admin:access
```

```js
// Declare
engine.registerPermission('blog:post:create');

// Check
engine.hasPermission(session.user, 'blog:post:create');
// → true if user.permissions includes it AND it was registered
```

Permissions are checked in services (business rules) and in menus (visibility). Routes themselves stay thin.

### Messages & Renderer

Routes never write to stdout directly. They emit **messages** through `session.send()`. The renderer decides how to display them.

`session.send()` accepts either a plain string (automatically normalized) or a structured message object:

```js
session.send('Hello');                              // { type: 'text', content: 'Hello' }
session.send({ type: 'header', title: 'Blog' });
session.send({ type: 'footer' });
session.send({ type: 'view', view: 'post-detail', data: { title: '...' } });
```

See [Message Types](#message-types) for the full reference.

### Input System

Input flows from the transport/renderer into the session via `session._input(data)`. Routes register handlers with `session.onInput(fn)`.

```js
engine.registerRoute('ask', (session) => {
  session.clearInput();
  session.send('Enter your name:');
  session.onInput((data) => {
    session.send('Hello, ' + data.trim());
  });
});

// Renderer or transport delivers input:
session._input('alice');
```

Always call `session.clearInput()` before registering new handlers in a route to prevent handler accumulation across navigations.

### Navigation & History

`engine.navigate(session, routeName)` transitions the session to a new route. Each navigation pushes the previous route onto `session.history`.

```js
engine.navigate(session, 'home');   // history: []
engine.navigate(session, 'blog');   // history: ['home']
engine.navigate(session, 'post');   // history: ['home', 'blog']

session.goBack();                   // → 'blog', history: ['home']
session.goBack();                   // → 'home', history: []
```

`goBack()` does not push to history — it is a clean backward step.

### Menu System

`createMenu` is a helper exported from `@neobbs/core` that handles option rendering, input registration, permission filtering, and back navigation automatically.

```js
const { createMenu } = require('@neobbs/core');

engine.registerRoute('home', (session) => {
  session.send({ type: 'header', title: 'Main Menu' });
  createMenu(engine, session, {
    title: 'Choose an option:',
    options: [
      { key: '1', label: 'Blog',  route: 'blog' },
      { key: '2', label: 'Forum', route: 'forum' },
      { key: '3', label: 'Admin', route: 'admin', permission: 'system:admin:access' },
    ],
  });
  session.send({ type: 'footer' });
});
```

- Options with a `permission` field are only shown to users who have that permission
- `[0] Back` is automatically added when `session.history` is non-empty
- Invalid input is handled and reported automatically
- `clearInput()` is called internally before registering handlers

---

## Core API

### Engine

```js
engine.use(plugin)
```
Calls `plugin(engine)`. Returns `engine` for chaining.

```js
engine.registerRoute(name, handler)
```
Maps a route name to a handler function `(session) => void`.

```js
engine.navigate(session, name)
```
Pushes the current route to history, updates `session.currentRoute`, and runs the handler. Emits `route:enter` and `route:after`. Catches errors and emits `error`.

```js
engine.on(event, handler)
engine.emit(event, payload)
```
Simple event system. Built-in events: `route:enter`, `route:after`, `error`.

```js
engine.registerService(name, service)
engine.getService(name)
```
Store and retrieve named services. Throws if a service is registered twice or retrieved when missing.

```js
engine.registerPermission(permission)
engine.hasPermission(user, permission)
```
Declare and check permissions. `hasPermission` returns `false` if the permission was never registered or if the user lacks it.

```js
engine.createSession(overrides = {})
```
Returns a new session object. Pass `overrides` to set `user`, `_out`, or any other field.

### Session

```js
session.send(msg)
```
Accepts a string or message object. Normalizes strings to `{ type: 'text', content }` and passes to `session._out`.

```js
session.onInput(handler)
session.clearInput()
session._input(data)
```
Register, clear, and trigger input handlers.

```js
session.goBack()
```
Navigate to the previous route in `session.history`. No-op if history is empty.

---

## Plugin API

A plugin is a function. It is responsible for:

1. Registering permissions it owns
2. Registering services (and their repositories)
3. Registering routes

```js
module.exports = function myPlugin(engine) {
  // 1. Permissions
  engine.registerPermission('myapp:item:read');
  engine.registerPermission('myapp:item:create');

  // 2. Repository + Service
  engine.registerService('myapp:repo', createItemRepo());
  engine.registerService('myapp', {
    listItems() {
      return engine.getService('myapp:repo').list();
    },
    createItem(session, title) {
      if (!engine.hasPermission(session.user, 'myapp:item:create')) {
        throw new Error('Permission denied');
      }
      return engine.getService('myapp:repo').create(title);
    },
  });

  // 3. Routes
  engine.registerRoute('myapp', (session) => {
    const items = engine.getService('myapp').listItems();
    session.send({ type: 'header', title: 'My App' });
    items.forEach((i) => session.send('- ' + i.title));
    session.send({ type: 'footer' });
  });
};
```

---

## Message Types

All messages pass through `session.send()` and are handled by the renderer.

| Type | Fields | Description |
|---|---|---|
| `text` | `content: string` | Plain text line |
| `header` | `title: string` | Screen title with dividers |
| `footer` | — | Prompt indicator (`> `) |
| `view` | `view: string`, `data?: any` | Named view with structured data |

Strings passed to `session.send()` are automatically normalized to `{ type: 'text', content }`.

---

## Renderer

The renderer handles all output. It is completely decoupled from the engine — it only receives messages.

### Using the terminal renderer

```js
const createRenderer = require('@neobbs/renderer-terminal');

const renderer = createRenderer();

const session = engine.createSession({
  _out: (msg) => renderer.render(msg),
});
```

### Registering custom views

```js
renderer.registerView('post-detail', (data) => {
  process.stdout.write('Title: ' + data.title + '\n');
  process.stdout.write('Body:  ' + data.body  + '\n');
});

// Route emits:
session.send({ type: 'view', view: 'post-detail', data: { title: '...', body: '...' } });
```

If no view is registered for a name, the renderer falls back to a JSON dump.

### Custom renderer

Replace `_out` at session creation with any function that accepts a message object:

```js
const session = engine.createSession({
  _out: (msg) => myWebRenderer.render(msg),
});
```

The engine and all routes require no changes.

---

## Example: Wiring Everything Together

```js
const Engine = require('@neobbs/core');
const { createMenu } = require('@neobbs/core');
const blogPlugin = require('@neobbs/app-blog');
const forumPlugin = require('@neobbs/app-forum');
const createRenderer = require('@neobbs/renderer-terminal');

const engine = new Engine();
engine.use(blogPlugin);
engine.use(forumPlugin);

engine.on('error', ({ route, error }) =>
  console.error('[error]', route, error.message));

const renderer = createRenderer();

engine.registerRoute('home', (session) => {
  session.send({ type: 'header', title: 'neobbs' });
  createMenu(engine, session, {
    title: 'Main Menu',
    options: [
      { key: '1', label: 'Blog',  route: 'blog' },
      { key: '2', label: 'Forum', route: 'forum' },
    ],
  });
  session.send({ type: 'footer' });
});

const session = engine.createSession({
  user: {
    username: 'alice',
    permissions: ['blog:post:read', 'blog:post:create', 'forum:topic:read'],
  },
  _out: (msg) => renderer.render(msg),
});

engine.navigate(session, 'home');

// Simulate user typing "1" to go to Blog
session._input('1');
```

---

## Current Features

- **Plugin system** — load apps as independent modules via `engine.use()`
- **Route system** — named routes with session-scoped handlers
- **Session model** — per-user state, identity, and output channel
- **Service container** — decouple business logic from routes
- **Repository pattern** — separate data storage from services
- **Permission system** — `domain:resource:action` format, declared by plugins
- **Event system** — `route:enter`, `route:after`, `error`
- **Message-based output** — structured messages, renderer-agnostic routes
- **Terminal renderer** — handles text, header, footer, and named views
- **Input system** — `onInput` / `clearInput` / `_input`
- **Navigation history** — forward navigation with `session.goBack()`
- **Menu helper** — `createMenu` with permission filtering and back support
- **Authentication flow** — login route that sets `session.user`
- **Permission-filtered menus** — options hidden based on user permissions

---

## Roadmap

- **Persistence** — SQLite or file-based storage replacing in-memory repositories
- **Real authentication** — password hashing, token sessions, registration flow
- **SSH transport** — `@neobbs/transport-ssh` connecting real terminal sessions to the engine
- **Web renderer** — `@neobbs/renderer-web` for browser-based clients
- **Multi-session runtime** — single process handling concurrent users
- **Theme system** — cyberpunk, retro, and custom color schemes
- **Plugin ecosystem** — chat, games, user profiles, private messages
