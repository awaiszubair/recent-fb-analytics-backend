import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type { ThirdPartyDataCreateInput, ThirdPartyDataEntity } from "../types/domain";

export class ThirdPartyDataRepository extends BaseRepository<ThirdPartyDataEntity> {
  protected readonly tableName = "third_party_data";

  protected get delegate() {
    return getDB().thirdPartyData;
  }

  createThirdPartyData(data: ThirdPartyDataCreateInput): Promise<ThirdPartyDataEntity> {
    return this.createRecord(data);
  }

  getPageThirdPartyData(pageId: string): Promise<ThirdPartyDataEntity[]> {
    return this.findManyRecords({
      where: { page_id: pageId },
      orderBy: { synced_at: "desc" },
    });
  }

  getPostThirdPartyData(postId: string): Promise<ThirdPartyDataEntity[]> {
    return this.findManyRecords({
      where: { post_id: postId },
    });
  }
}

export default new ThirdPartyDataRepository();
