'use strict';

const Engine = require('@neobbs/core');
const createRenderer = require('@neobbs/renderer-terminal');
const examplePlugin = require('./plugin');

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
