'use strict';

function createTopicRepo() {
  const topics = [];

  return {
    createTopic(title) {
      const topic = { title };
      topics.push(topic);
      return topic;
    },

    listTopics() {
      return topics;
    },
  };
}

module.exports = createTopicRepo;
