'use strict';

function createPostRepo() {
  const posts = [];

  return {
    createPost(title) {
      const post = { title };
      posts.push(post);
      return post;
    },

    listPosts() {
      return posts;
    },
  };
}

module.exports = createPostRepo;
