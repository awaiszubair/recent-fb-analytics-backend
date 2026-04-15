const PostModel = require('../repositories/Post');

// Create a new post
const createPost = async (postData) => {
  return await PostModel.createPost(postData);
};

// Get post by ID
const getPostById = async (postId) => {
  return await PostModel.getPostById(postId);
};

// Get all posts for a page
const getPagePosts = async (pageId) => {
  return await PostModel.getPagePosts(pageId);
};

module.exports = { createPost, getPostById, getPagePosts };
