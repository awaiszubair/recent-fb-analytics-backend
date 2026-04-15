import { BaseService } from "../core/base.service";
import connectedPageRepository from "../repositories/ConnectedPage";
import type { ConnectedPageCreateInput, ConnectedPageEntity } from "../types/domain";

export class PageService extends BaseService {
  constructor() {
    super("PageService");
  }

  createConnectedPage(pageData: ConnectedPageCreateInput): Promise<ConnectedPageEntity> {
    return connectedPageRepository.createPage(pageData);
  }

  getPageById(pageId: string): Promise<ConnectedPageEntity | null> {
    return connectedPageRepository.getPageById(pageId);
  }

  getPartnerPages(partnerId: string): Promise<ConnectedPageEntity[]> {
    return connectedPageRepository.getPartnerPages(partnerId);
  }

  updatePage(pageId: string, updates: Partial<ConnectedPageCreateInput>): Promise<ConnectedPageEntity> {
    return connectedPageRepository.updatePage(pageId, updates);
  }
}

export default new PageService();
