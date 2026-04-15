import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type { ConnectedPageCreateInput, ConnectedPageEntity } from "../types/domain";

export class ConnectedPageRepository extends BaseRepository<ConnectedPageEntity> {
  protected readonly tableName = "connected_pages";

  protected get delegate() {
    return getDB().connectedPage;
  }

  createPage(pageData: ConnectedPageCreateInput): Promise<ConnectedPageEntity> {
    return this.createRecord(pageData);
  }

  getPageById(pageId: string): Promise<ConnectedPageEntity | null> {
    return this.findById(pageId);
  }

  getPartnerPages(partnerId: string): Promise<ConnectedPageEntity[]> {
    return this.findManyRecords({
      where: { partner_id: partnerId },
    });
  }

  updatePage(pageId: string, updates: Partial<ConnectedPageCreateInput>): Promise<ConnectedPageEntity> {
    return this.updateRecord({ id: pageId }, updates);
  }

  upsertPage(pageData: ConnectedPageCreateInput): Promise<ConnectedPageEntity> {
    return this.upsertByLookup(
      { partner_id: pageData.partner_id, fb_page_id: pageData.fb_page_id },
      pageData,
      pageData
    );
  }
}

export default new ConnectedPageRepository();
