'use strict';

const Engine = require('@neobbs/core');
const createRenderer = require('@neobbs/renderer-terminal');

// --- Plugin ---

function examplePlugin(engine) {
  engine.registerPermission('example:item:read');

  engine.registerService('example', {
    getMessage() {
      return 'Hello from the example service.';
    },
  });

  engine.registerRoute('example', (session) => {
    const example = engine.getService('example');

    session.send({ type: 'header', title: 'Minimal Plugin' });
    session.send(example.getMessage());
    session.send({ type: 'footer' });
  });
}

module.exports = examplePlugin;

// --- Application ---

const engine = new Engine();
engine.use(examplePlugin);

const renderer = createRenderer();

const session = engine.createSession({
  _out: (msg) => renderer.render(msg),
});

process.stdin.setEncoding('utf8');
process.stdin.resume();
process.stdin.on('data', (chunk) => {
  chunk.split('\n').forEach((line) => {
    const input = line.trim();
    if (input) session._input(input);
  });
});

process.on('SIGINT', () => process.exit(0));

engine.navigate(session, 'example');
