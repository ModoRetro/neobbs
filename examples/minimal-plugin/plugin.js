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
