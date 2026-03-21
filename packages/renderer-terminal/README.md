# @neobbs/renderer-terminal

Terminal renderer for [neobbs](https://github.com/ModoRetro/neobbs) applications.

Handles structured messages from the engine and writes formatted output to `process.stdout`.

## Installation

```bash
npm install @neobbs/renderer-terminal
```

## Usage

```js
const Engine = require('@neobbs/core');
const createRenderer = require('@neobbs/renderer-terminal');

const engine = new Engine();
const renderer = createRenderer();

const session = engine.createSession({
  _out: (msg) => renderer.render(msg),
});
```

Plug the renderer into a session by setting `session._out`. The engine and routes require no changes.

## Message Types

All output from routes flows through `session.send(msg)`, which normalizes strings to `{ type: 'text', content }` and calls `session._out`. The renderer handles each type:

| Type | Fields | Output |
|---|---|---|
| `text` | `content: string` | Prints the string followed by a newline |
| `header` | `title: string` | Divider + title + divider + blank line |
| `footer` | — | Divider + `>> ` prompt indicator |
| `clear` | — | Clears the terminal (`\x1Bc`) |
| `view` | `view: string`, `data?: any` | Calls registered view function, or falls back to JSON dump |

## Registering Custom Views

```js
renderer.registerView('post-detail', (data) => {
  process.stdout.write('Title:   ' + data.title + '\n');
  process.stdout.write('Content: ' + data.content + '\n');
});

// Route emits:
session.send({ type: 'view', view: 'post-detail', data: post });
```

If no view is registered for a name, the renderer falls back to printing the data as JSON.

## Custom Renderer

To use a different renderer (web, SSH, test), replace `session._out`:

```js
const session = engine.createSession({
  _out: (msg) => {
    if (msg.type === 'text') myTransport.write(msg.content);
  },
});
```

Routes and plugins never reference the renderer directly — they only call `session.send()`.

## License

MIT — see [LICENSE](../../LICENSE)
