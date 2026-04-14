const postService = require('../services/post.service');
const formatter = require('../utils/formatter');
const { sendResponse } = require('../utils/response');

// Get post by ID
const getPostById = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await postService.getPostById(postId);
    
    if (!post) {
      return sendResponse(res, 404, 'Post not found', null);
    }

    // Apply formatter to ensure consistent structure
    const formattedPost = formatter.formatPost(post.page_id, post);
    
    sendResponse(res, 200, 'Post retrieved successfully', formattedPost);
  } catch (error) {
    next(error);
  }
};

// Get all posts for a page
const getPagePosts = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const posts = await postService.getPagePosts(pageId);
    
    // Apply formatter to each post for consistent structure
    const formattedPosts = posts.map(post => formatter.formatPost(pageId, post));
    
    sendResponse(res, 200, 'Posts retrieved successfully', formattedPosts);
  } catch (error) {
    next(error);
  }
};

// Create post
const createPost = async (req, res, next) => {
  try {
    const postData = req.body;
    const post = await postService.createPost(postData);
    
    // Apply formatter to ensure consistent structure
    const formattedPost = formatter.formatPost(post.page_id, post);
    
    sendResponse(res, 201, 'Post created successfully', formattedPost);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPostById, getPagePosts, createPost };
