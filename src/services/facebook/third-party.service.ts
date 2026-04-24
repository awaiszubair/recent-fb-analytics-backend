import thirdPartyDataRepository from "../../repositories/ThirdPartyData";
import type { ThirdPartyDataCreateInput, ThirdPartyDataEntity } from "../../types/domain";

export class ThirdPartyService {
  async saveThirdPartyData(
    pageId: string | null,
    postId: string | null,
    dataType: string,
    value: unknown
  ): Promise<ThirdPartyDataEntity> {
    const payload: ThirdPartyDataCreateInput = {
      page_id: pageId,
      post_id: postId,
      data_type: dataType,
      value: value as never,
      synced_at: new Date(),
    };

    return thirdPartyDataRepository.createThirdPartyData(payload);
  }
}

export default new ThirdPartyService();
