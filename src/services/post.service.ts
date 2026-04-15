import { BaseService } from "../core/base.service";
import postRepository from "../repositories/Post";
import type { PostCreateInput, PostEntity } from "../types/domain";

export class PostService extends BaseService {
  constructor() {
    super("PostService");
  }

  createPost(postData: PostCreateInput): Promise<PostEntity> {
    return postRepository.createPost(postData);
  }

  getPostById(postId: string): Promise<PostEntity | null> {
    return postRepository.getPostById(postId);
  }

  getPagePosts(pageId: string): Promise<PostEntity[]> {
    return postRepository.getPagePosts(pageId);
  }
}

export default new PostService();
