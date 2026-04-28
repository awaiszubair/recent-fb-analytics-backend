import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type { PostCreateInput, PostEntity } from "../types/domain";

export class PostRepository extends BaseRepository<PostEntity> {
  protected readonly tableName = "posts";

  protected get delegate() {
    return getDB().post;
  }

  createPost(postData: PostCreateInput): Promise<PostEntity> {
    return this.createRecord(postData);
  }

  getPostById(postId: string): Promise<PostEntity | null> {
    if (postId.includes("_") || postId.length > 36) {
      return this.getPostByFbPostId(postId);
    }
    return this.findById(postId);
  }

  getPostByFbPostId(fbPostId: string): Promise<PostEntity | null> {
    return this.findManyRecords({
      where: { fb_post_id: fbPostId },
    }).then((posts) => posts[0] || null);
  }

  getPagePosts(pageId: string): Promise<PostEntity[]> {
    return this.findManyRecords({
      where: { page_id: pageId },
      orderBy: { created_time: "desc" },
    });
  }

  updatePost(postId: string, updates: Partial<PostCreateInput>): Promise<PostEntity> {
    return this.updateRecord({ id: postId }, updates);
  }

  async upsertPost(postData: PostCreateInput): Promise<PostEntity> {
    return getDB().post.upsert({
      where: {
        page_id_fb_post_id: {
          page_id: postData.page_id,
          fb_post_id: postData.fb_post_id,
        },
      } as never,
      create: postData,
      update: postData,
    });
  }
}

export default new PostRepository();
