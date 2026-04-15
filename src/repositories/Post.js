const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  buildWhere,
  normalizeRecord,
  normalizeRecords,
  stripUndefined,
  upsertByLookup
} = require('../utils/prismaHelpers');

const getPostDelegate = () => getDB().post;

// Create post
const createPost = async (postData) => {
  try {
    const { valid, errors } = validateData('posts', postData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const post = await getPostDelegate().create({
      data: stripUndefined(postData)
    });

    return normalizeRecord(post);
  } catch (error) {
    throw new Error(`Error creating post: ${error.message}`);
  }
};

// Get post by ID
const getPostById = async (postId) => {
  try {
    const post = await getPostDelegate().findUnique({
      where: { id: postId }
    });

    return normalizeRecord(post);
  } catch (error) {
    throw new Error(`Error fetching post: ${error.message}`);
  }
};

// Get all posts for a page
const getPagePosts = async (pageId) => {
  try {
    const posts = await getPostDelegate().findMany({
      where: { page_id: pageId },
      orderBy: { created_time: 'desc' }
    });

    return normalizeRecords(posts);
  } catch (error) {
    throw new Error(`Error fetching posts: ${error.message}`);
  }
};

// Update post
const updatePost = async (postId, updates) => {
  try {
    const cleanedUpdates = stripUndefined(updates);

    if (Object.keys(cleanedUpdates).length === 0) {
      return getPostById(postId);
    }

    const post = await getPostDelegate().update({
      where: { id: postId },
      data: cleanedUpdates
    });

    return normalizeRecord(post);
  } catch (error) {
    throw new Error(`Error updating post: ${error.message}`);
  }
};

// Upsert post
const upsertPost = async (postData) => {
  try {
    const { valid, errors } = validateData('posts', postData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const post = await upsertByLookup({
      delegate: getPostDelegate(),
      where: buildWhere({
        page_id: postData.page_id,
        fb_post_id: postData.fb_post_id
      }),
      create: postData,
      update: postData
    });

    return normalizeRecord(post);
  } catch (error) {
    throw new Error(`Error upserting post: ${error.message}`);
  }
};

module.exports = { createPost, getPostById, getPagePosts, updatePost, upsertPost };
