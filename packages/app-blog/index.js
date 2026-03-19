'use strict';

const createPostRepo = require('./postRepo');

module.exports = function (engine) {
  engine.registerPermission('blog:post:read');
  engine.registerPermission('blog:post:create');

  engine.registerService('blog:repo', createPostRepo());

  engine.registerService('blog', {
    listPosts() {
      return engine.getService('blog:repo').listPosts();
    },

    createPost(session, title) {
      if (!engine.hasPermission(session.user, 'blog:post:create')) {
        throw new Error('Permission denied');
      }
      return engine.getService('blog:repo').createPost(title);
    },
  });

  engine.registerRoute('blog', (session) => {
    const blog = engine.getService('blog');
    session.send('--- Blog ---');
    const posts = blog.listPosts();
    if (posts.length === 0) {
      session.send('No posts yet.');
    } else {
      posts.forEach((p) => session.send('- ' + p.title));
    }
  });

  engine.registerRoute('blog:new', (session) => {
    const blog = engine.getService('blog');
    blog.createPost(session, 'Untitled post');
    session.send('Post created.');
  });
};
