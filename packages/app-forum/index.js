'use strict';

const createTopicRepo = require('./topicRepo');

module.exports = function (engine) {
  engine.registerPermission('forum:topic:read');
  engine.registerPermission('forum:topic:create');

  engine.registerService('forum:repo', createTopicRepo());

  engine.registerService('forum', {
    listTopics() {
      return engine.getService('forum:repo').listTopics();
    },

    createTopic(session, title) {
      if (!engine.hasPermission(session.user, 'forum:topic:create')) {
        throw new Error('Permission denied');
      }
      return engine.getService('forum:repo').createTopic(title);
    },
  });

  engine.registerRoute('forum', (session) => {
    const forum = engine.getService('forum');
    session.send('--- Forum ---');
    const topics = forum.listTopics();
    if (topics.length === 0) {
      session.send('No topics yet.');
    } else {
      topics.forEach((t) => session.send('- ' + t.title));
    }
  });

  engine.registerRoute('forum:new', (session) => {
    const forum = engine.getService('forum');
    forum.createTopic(session, 'Untitled topic');
    session.send('Topic created.');
  });
};
