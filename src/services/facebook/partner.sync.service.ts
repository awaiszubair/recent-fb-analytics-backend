import insightsService from "../insights.service";
import partnerRepository from "../../repositories/Partner";
import type { PartnerCreateInput, PartnerEntity } from "../../types/domain";

export class PartnerSyncService {
  async syncPartner(accessToken: string): Promise<PartnerEntity> {
    const fbUser = await insightsService.getUserDetails({ access_token: accessToken });
    const user = fbUser.data as { id: string; name?: string; email?: string };

    const partnerInput: PartnerCreateInput = {
      user_id: user.id,
      name: user.name || null,
      email: user.email || null,
    };

    return partnerRepository.upsertPartner(partnerInput);
  }
}

export default new PartnerSyncService();
