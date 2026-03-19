'use strict';

const Engine = require('@neobbs/core');
const { createMenu } = require('@neobbs/core');
const blogPlugin = require('@neobbs/app-blog');
const forumPlugin = require('@neobbs/app-forum');
const createRenderer = require('@neobbs/renderer-terminal');

const engine = new Engine();
engine.use(blogPlugin);
engine.use(forumPlugin);

engine.on('error', ({ route, error }) =>
  console.log('[error] ' + route + ': ' + error.message));

const renderer = createRenderer();

// Fake user store — no persistence yet
const USERS = {
  alice: { username: 'alice', permissions: ['blog:post:read', 'blog:post:create', 'forum:topic:read', 'forum:topic:create', 'system:admin:access'] },
  bob:   { username: 'bob',   permissions: ['blog:post:read', 'forum:topic:read'] },
};

const GUEST = { username: 'guest', permissions: [] };

engine.registerRoute('login', (session) => {
  session.clearInput();
  session.send({ type: 'header', title: 'Login' });
  session.send('Username (or press Enter to continue as guest):');
  session.send({ type: 'footer' });

  session.onInput((data) => {
    const username = data.trim();
    session.user = USERS[username] || GUEST;
    if (session.user === GUEST && username !== '') {
      session.send('Unknown user. Continuing as guest.');
    }
    session.send('Welcome, ' + session.user.username + '!');
    engine.navigate(session, 'home');
  });
});

engine.registerPermission('system:admin:access');

engine.registerRoute('admin', (session) => {
  session.send({ type: 'header', title: 'Admin' });
  session.send('Welcome to the admin panel.');
  session.send({ type: 'footer' });
});

engine.registerRoute('home', (session) => {
  session.send({ type: 'header', title: 'neobbs — ' + session.user.username });
  createMenu(engine, session, {
    title: 'Main Menu',
    options: [
      { key: '1', label: 'Blog',  route: 'blog' },
      { key: '2', label: 'Forum', route: 'forum' },
      { key: '3', label: 'Admin', route: 'admin', permission: 'system:admin:access' },
    ],
  });
  session.send({ type: 'footer' });
});

engine.registerRoute('blog', (session) => {
  const blog = engine.getService('blog');
  session.send({ type: 'header', title: 'Blog' });
  const posts = blog.listPosts();
  if (posts.length === 0) {
    session.send('No posts yet.');
  } else {
    posts.forEach((p) => session.send('- ' + p.title));
  }
  session.send({ type: 'footer' });
});

engine.registerRoute('forum', (session) => {
  const forum = engine.getService('forum');
  session.send({ type: 'header', title: 'Forum' });
  const topics = forum.listTopics();
  if (topics.length === 0) {
    session.send('No topics yet.');
  } else {
    topics.forEach((t) => session.send('- ' + t.title));
  }
  session.send({ type: 'footer' });
});

const out = (msg) => renderer.render(msg);

// alice — has system:admin:access → sees Admin option
console.log('=== alice (admin) ===');
const s1 = engine.createSession({ user: GUEST, _out: out });
engine.navigate(s1, 'login');
s1._input('alice');

// bob — no admin permission → no Admin option
console.log('\n=== bob (no admin) ===');
const s2 = engine.createSession({ user: GUEST, _out: out });
engine.navigate(s2, 'login');
s2._input('bob');
