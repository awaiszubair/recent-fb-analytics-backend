import type { NextFunction, Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import postService from "../services/post/post.service";
import postRepository from "../repositories/Post";
import connectedPageRepository from "../repositories/ConnectedPage";
import { ResponseFormatter } from "../utils/formatter";
import { isUuid } from "../utils/uuid";

export class PostController extends BaseController {
  getPostById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { postId } = req.params as Record<string, string>;
      let realPostId = postId;
      if (isUuid(postId)) {
        const post = await postRepository.getPostById(postId);
        if (post) {
          realPostId = post.fb_post_id;
        }
      }
      const post = await postService.getPostById(realPostId);

      if (!post) {
        return this.notFound(res, "Post not found");
      }

      const formattedPost = ResponseFormatter.formatPost(post.page_id, post as never);
      return this.ok(res, formattedPost, "Post retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };

  getPagePosts = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { pageId } = req.params as Record<string, string>;
      let realPageId = pageId;
      if (isUuid(pageId)) {
        const page = await connectedPageRepository.getPageById(pageId);
        if (page) {
          realPageId = page.fb_page_id;
        }
      }
      const posts = await postService.getPagePosts(realPageId);
      console.log(`[PostController] Found ${posts.length} posts for page ${realPageId}`);
      const formattedPosts = posts.map((post) => ResponseFormatter.formatPost(realPageId, post as never));
      return this.ok(res, formattedPosts, "Posts retrieved successfully");
    } catch (error) {
      console.error(`[PostController] Error getting posts for page ${req.params.pageId}:`, error);
      return next(error);
    }
  };

  createPost = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const postData = req.body as Record<string, unknown>;
      const post = await postService.createPost(postData as never);
      const formattedPost = ResponseFormatter.formatPost(post.page_id, post as never);
      return this.created(res, formattedPost, "Post created successfully");
    } catch (error) {
      return next(error);
    }
  };
}

export default new PostController();
