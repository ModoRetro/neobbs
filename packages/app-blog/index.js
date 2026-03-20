'use strict';

const createPostRepo = require('./postRepo');
const { createFlow } = require('@neobbs/core');

module.exports = function (engine) {
  engine.registerPermission('blog:post:read');
  engine.registerPermission('blog:post:create');

  engine.registerService('blog:repo', createPostRepo());

  engine.registerService('blog', {
    listPosts() {
      return engine.getService('blog:repo').listPosts();
    },

    createPost(session, title, content) {
      if (!engine.hasPermission(session.user, 'blog:post:create')) {
        throw new Error('Permission denied');
      }
      return engine.getService('blog:repo').createPost(title, content);
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
    session.state.newPost = {};
    session.send({ type: 'header', title: 'New Post' });

    createFlow(session, [
      {
        prompt: 'Enter post title:',
        validate: (input) => input ? null : 'Title cannot be empty.',
        next: (session, input) => { session.state.newPost.title = input; },
      },
      {
        prompt: 'Enter post content:',
        validate: (input) => input ? null : 'Content cannot be empty.',
        next: (session, input) => { session.state.newPost.content = input; },
      },
      {
        prompt: (session) => {
          session.send('Title:   ' + session.state.newPost.title);
          session.send('Content: ' + session.state.newPost.content);
          session.send('');
          session.send('Confirm? [y/n]');
        },
        validate: (input) => {
          if (input === 'y' || input === 'n') return null;
          return 'Please enter y or n.';
        },
        next: (session, input) => {
          if (input === 'n') {
            session.state.newPost = {};
            engine.navigate(session, 'blog');
            return;
          }
          try {
            blog.createPost(session, session.state.newPost.title, session.state.newPost.content);
            session.state.newPost = {};
            engine.navigate(session, 'blog');
          } catch (err) {
            session.send('Error: ' + err.message);
          }
        },
      },
    ]);
  });
};
