'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../../data/forum.json');

function loadFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[topicRepo] load error:', err.message);
      saveFile(filePath, []);
    }
    return [];
  }
}

function saveFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[topicRepo] save error:', err.message);
  }
}

function createTopicRepo() {
  const topics = loadFile(DATA_FILE);

  return {
    createTopic(title) {
      const topic = { id: Date.now(), title };
      topics.push(topic);
      saveFile(DATA_FILE, topics);
      return topic;
    },

    listTopics() {
      return topics;
    },
  };
}

module.exports = createTopicRepo;
