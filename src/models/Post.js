const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

// Create post
const createPost = async (postData) => {
  try {
    const { valid, errors } = validateData('posts', postData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('posts')
      .insert([postData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating post: ${error.message}`);
  }
};

// Get post by ID
const getPostById = async (postId) => {
  try {
    const { data, error } = await getDB()
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching post: ${error.message}`);
  }
};

// Get all posts for a page
const getPagePosts = async (pageId) => {
  try {
    const { data, error } = await getDB()
      .from('posts')
      .select('*')
      .eq('page_id', pageId)
      .order('created_time', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching posts: ${error.message}`);
  }
};

// Update post
const updatePost = async (postId, updates) => {
  try {
    const { data, error } = await getDB()
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error updating post: ${error.message}`);
  }
};

// Upsert post
const upsertPost = async (postData) => {
  try {
    const { valid, errors } = validateData('posts', postData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('posts')
      .upsert(postData, { onConflict: 'page_id,fb_post_id' })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error upserting post: ${error.message}`);
  }
};

module.exports = { createPost, getPostById, getPagePosts, updatePost, upsertPost };
