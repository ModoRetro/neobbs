'use strict';

const DIVIDER = '─'.repeat(40);

function renderHeader(title) {
  process.stdout.write(DIVIDER + '\n');
  process.stdout.write(' ' + title + '\n');
  process.stdout.write(DIVIDER + '\n');
}

function renderFooter() {
  process.stdout.write(DIVIDER + '\n');
  process.stdout.write('> ');
}

function createRenderer() {
  const views = new Map();

  return {
    renderHeader,
    renderFooter,

    registerView(name, fn) {
      views.set(name, fn);
    },

    render(message) {
      switch (message.type) {
        case 'text':
          process.stdout.write(message.content + '\n');
          break;
        case 'header':
          renderHeader(message.title);
          break;
        case 'footer':
          renderFooter();
          break;
        case 'view': {
          const fn = views.get(message.view);
          if (fn) {
            fn(message.data ?? {});
          } else {
            process.stdout.write('[view: ' + message.view + '] ' + JSON.stringify(message.data ?? {}) + '\n');
          }
          break;
        }
        default:
          process.stdout.write('[unknown message type: ' + message.type + ']\n');
      }
    },
  };
}

module.exports = createRenderer;
