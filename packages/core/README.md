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

Multi-step input flow helper. Guides a user through a sequence of prompts, validating each answer before advancing.

```js
const { createFlow } = require('@neobbs/core');

createFlow(session, steps);
```

### Step Structure

Each step is an object with the following fields:

```js
{
  prompt,    // string or function — shown to the user
  validate,  // optional function — returns null or an error string
  next,      // function — called when input is valid
}
```

**`prompt`**

A string displayed before input, or a function that renders dynamic content:

```js
prompt: 'Enter your name:'

// or

prompt: (session) => {
  session.send('Title: ' + session.state.title);
  session.send('Confirm? [y/n]');
}
```

**`validate(input)`**

Optional. Receives the trimmed user input. Must return:
- `null` — input is valid, flow advances
- `string` — error message, step is retried

**`next(session, input)`**

Called once validation passes. Use it to store data or trigger navigation. The flow automatically advances to the next step after `next` returns.

### Multi-Step Form Example

```js
const { createFlow } = require('@neobbs/core');

createFlow(session, [
  {
    prompt: 'Enter your name:',
    validate: (input) => input ? null : 'Name cannot be empty.',
    next: (session, input) => {
      session.state.name = input;
    },
  },
  {
    prompt: 'Enter your age:',
    validate: (input) =>
      /^\d+$/.test(input) ? null : 'Age must be a number.',
    next: (session, input) => {
      session.state.age = Number(input);
    },
  },
]);
```

This example collects multiple pieces of data and stores them in `session.state`. Each step runs only after validation succeeds.

### Confirmation Step Example

```js
createFlow(session, [
  {
    prompt: 'Enter title:',
    validate: (input) => input ? null : 'Title required.',
    next: (session, input) => {
      session.state.title = input;
    },
  },
  {
    prompt: (session) => {
      session.send('');
      session.send('Title: ' + session.state.title);
      session.send('');
      session.send('Confirm? [y/n]');
    },
    validate: (input) => {
      if (input === 'y' || input === 'n') return null;
      return 'Please enter y or n.';
    },
    next: (session, input) => {
      if (input === 'y') {
        session.send('Saved!');
      }
      session.state = {};
    },
  },
]);
```

This demonstrates dynamic prompts, confirmation flows, and branching behavior based on user input.

### Validation Behavior

When `validate()` returns a string, the flow:

1. Displays the error message
2. Re-renders the same step prompt
3. Waits for new input
4. Does not advance until valid input is provided

Example — empty name input:

```
Name cannot be empty.
Enter your name:
>>
```

### Retry Logic

`createFlow` automatically retries the current step when validation fails. Developers do not need to manually re-register input handlers or track which step is active.

`createFlow` handles:
- input registration and cleanup (`clearInput` is called per step)
- step progression
- prompt re-rendering on retry

## License

MIT — see [LICENSE](../../LICENSE)
