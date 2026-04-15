import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type { PartnerCreateInput, PartnerEntity } from "../types/domain";
import { PrismaHelpers } from "../utils/prismaHelpers";

export class PartnerRepository extends BaseRepository<PartnerEntity> {
  protected readonly tableName = "partners";

  protected get delegate() {
    return getDB().partner;
  }

  createPartner(partnerData: PartnerCreateInput): Promise<PartnerEntity> {
    return this.createRecord(partnerData);
  }

  async getPartnerByUserId(userId: string): Promise<PartnerEntity | null> {
    return PrismaHelpers.normalizeRecord(
      await this.delegate.findUnique({ where: { user_id: userId } })
    ) as PartnerEntity | null;
  }

  getPartnerById(partnerId: string): Promise<PartnerEntity | null> {
    return this.findById(partnerId);
  }

  getAllPartners(): Promise<PartnerEntity[]> {
    return this.findManyRecords();
  }

  updatePartner(partnerId: string, updates: Partial<PartnerCreateInput>): Promise<PartnerEntity> {
    return this.updateRecord({ id: partnerId }, updates);
  }

  upsertPartner(partnerData: PartnerCreateInput): Promise<PartnerEntity> {
    return this.upsertByLookup({ user_id: partnerData.user_id }, partnerData, partnerData);
  }
}

export default new PartnerRepository();
