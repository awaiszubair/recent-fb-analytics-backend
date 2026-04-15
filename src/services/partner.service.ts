import { BaseService } from "../core/base.service";
import partnerRepository from "../repositories/Partner";
import type { PartnerCreateInput, PartnerEntity } from "../types/domain";

export class PartnerService extends BaseService {
  constructor() {
    super("PartnerService");
  }

  createPartner(partnerData: PartnerCreateInput): Promise<PartnerEntity> {
    return partnerRepository.createPartner(partnerData);
  }

  getPartnerByUserId(userId: string): Promise<PartnerEntity | null> {
    return partnerRepository.getPartnerByUserId(userId);
  }

  getPartnerById(partnerId: string): Promise<PartnerEntity | null> {
    return partnerRepository.getPartnerById(partnerId);
  }

  getAllPartners(): Promise<PartnerEntity[]> {
    return partnerRepository.getAllPartners();
  }
}

export default new PartnerService();
