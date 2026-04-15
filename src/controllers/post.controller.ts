import type { NextFunction, Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import postService from "../services/post.service";
import { ResponseFormatter } from "../utils/formatter";

export class PostController extends BaseController {
  getPostById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { postId } = req.params as Record<string, string>;
      const post = await postService.getPostById(postId);

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
      const posts = await postService.getPagePosts(pageId);
      const formattedPosts = posts.map((post) => ResponseFormatter.formatPost(pageId, post as never));
      return this.ok(res, formattedPosts, "Posts retrieved successfully");
    } catch (error) {
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
