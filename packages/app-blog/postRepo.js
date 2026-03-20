'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../../data/blog.json');

function loadFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[postRepo] load error:', err.message);
    return [];
  }
}

function saveFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[postRepo] save error:', err.message);
  }
}

function createPostRepo() {
  const posts = loadFile(DATA_FILE);

  return {
    createPost(title, content) {
      const post = { 
        id: Date.now(),
        title,
        content
      };
      posts.push(post);
      saveFile(DATA_FILE, posts);
      return post;
    },

    listPosts() {
      return posts;
    },
  };
}

module.exports = createPostRepo;
