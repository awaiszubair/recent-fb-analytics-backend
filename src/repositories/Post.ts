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
    return this.findById(postId);
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

  upsertPost(postData: PostCreateInput): Promise<PostEntity> {
    return this.upsertByLookup(
      { page_id: postData.page_id, fb_post_id: postData.fb_post_id },
      postData,
      postData
    );
  }
}

export default new PostRepository();
