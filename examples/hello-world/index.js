'use strict';

const Engine = require('@neobbs/core');
const createRenderer = require('@neobbs/renderer-terminal');

const engine = new Engine();
const renderer = createRenderer();

engine.registerRoute('home', (session) => {
  session.send({ type: 'header', title: 'Hello World' });
  session.send('Welcome to neobbs.');
  session.send({ type: 'footer' });
});

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

engine.navigate(session, 'home');
