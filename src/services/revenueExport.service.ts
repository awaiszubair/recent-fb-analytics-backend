import connectedPageRepository from "../repositories/ConnectedPage";
import earningsRepository from "../repositories/Earnings";
import partnerRepository from "../repositories/Partner";
import type { ConnectedPageEntity, PartnerEntity } from "../types/domain";

export interface RevenueExportRecord {
  partner_name: string;
  page_name: string;
  revenue_amount: number;
  currency: "USD" | string;
  period_start: string;
  period_end: string;
  source: "fb_monetization";
  pulled_at: string;
}

export interface RevenueExportQuery {
  startDate: string;
  endDate: string;
  partner?: string;
}

export class RevenueExportError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "RevenueExportError";
    this.statusCode = statusCode;
  }
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const normalizeText = (value: string): string => value.trim().toLowerCase();

const formatDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const toNumber = (value: bigint | number | string): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseDateOnly = (value: string, fieldName: string): Date => {
  const trimmed = value.trim();

  if (!datePattern.test(trimmed)) {
    throw new RevenueExportError(`${fieldName} must be in YYYY-MM-DD format`);
  }

  const [yearText, monthText, dayText] = trimmed.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RevenueExportError(`${fieldName} must be a valid calendar date`);
  }

  return parsed;
};

const endOfUtcDay = (date: Date): Date => {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
};

const buildPartnerMaps = (
  partners: PartnerEntity[],
  pages: ConnectedPageEntity[]
): {
  partnersById: Map<string, PartnerEntity>;
  pagesByFbPageId: Map<string, ConnectedPageEntity>;
} => {
  const partnersById = new Map<string, PartnerEntity>();
  const pagesByFbPageId = new Map<string, ConnectedPageEntity>();

  for (const partner of partners) {
    partnersById.set(partner.id, partner);
  }

  for (const page of pages) {
    pagesByFbPageId.set(page.fb_page_id, page);
  }

  return { partnersById, pagesByFbPageId };
};

export class RevenueExportService {
  async exportRevenue(query: RevenueExportQuery): Promise<RevenueExportRecord[]> {
    const startDate = parseDateOnly(query.startDate, "start_date");
    const endDate = parseDateOnly(query.endDate, "end_date");

    if (startDate.getTime() > endDate.getTime()) {
      throw new RevenueExportError("start_date must be less than or equal to end_date");
    }

    const partnerFilter = query.partner?.trim();
    const allPartners = await partnerRepository.getAllPartners();
    const selectedPartners = partnerFilter
      ? allPartners.filter((partner) => normalizeText(partner.name ?? "") === normalizeText(partnerFilter))
      : allPartners;

    if (partnerFilter && selectedPartners.length === 0) {
      return [];
    }

    const pages: ConnectedPageEntity[] = [];

    await Promise.all(
      selectedPartners.map(async (partner) => {
        const partnerPages = await connectedPageRepository.getPartnerPages(partner.id);
        pages.push(...partnerPages);
      })
    );

    if (pages.length === 0) {
      return [];
    }

    const { partnersById, pagesByFbPageId } = buildPartnerMaps(selectedPartners, pages);
    const pageIds = Array.from(pagesByFbPageId.keys());
    const earningsRows = await earningsRepository.getPageEarningsByPageIdsAndRange(
      pageIds,
      startDate,
      endOfUtcDay(endDate)
    );
    const pulledAt = new Date().toISOString();

    return earningsRows
      .map((row): RevenueExportRecord | null => {
        if (!row.end_time) {
          return null;
        }

        const page = pagesByFbPageId.get(row.page_id);
        if (!page) {
          return null;
        }

        const partner = partnersById.get(page.partner_id);

        return {
          partner_name: partner?.name?.trim() || "",
          page_name: page.page_name?.trim() || "",
          revenue_amount: toNumber(row.earnings_amount),
          currency: row.currency || "USD",
          period_start: formatDateOnly(row.end_time),
          period_end: formatDateOnly(row.end_time),
          source: "fb_monetization",
          pulled_at: pulledAt,
        };
      })
      .filter((record): record is RevenueExportRecord => record !== null)
      .sort((left, right) => {
        const partnerCompare = left.partner_name.localeCompare(right.partner_name);
        if (partnerCompare !== 0) {
          return partnerCompare;
        }

        const pageCompare = left.page_name.localeCompare(right.page_name);
        if (pageCompare !== 0) {
          return pageCompare;
        }

        return left.period_start.localeCompare(right.period_start);
      });
  }
}

export default new RevenueExportService();
