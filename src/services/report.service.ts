import PDFDocument from "pdfkit";
import storageService from "./storage.service";
import connectedPageRepository from "../repositories/ConnectedPage";

class ReportService {
  async generateAndUploadPageReport(pageId: string, since: string, until: string, insightsData: any[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const page = await connectedPageRepository.getPageByFbPageId(pageId);
        const pageName = page?.page_name || "Facebook Page";

        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", async () => {
          try {
            const pdfData = Buffer.concat(buffers);
            const filename = `report-${pageId}-${since}-to-${until}.pdf`;
            const fileUrl = await storageService.uploadPdf(pdfData, filename);
            resolve(fileUrl);
          } catch (uploadError) {
            reject(uploadError);
          }
        });

        // Build the PDF content
        doc.fontSize(25).fillColor("#FF6B00").text("Facebook Analytics Report", { align: "center" });
        doc.moveDown();

        doc.fontSize(16).fillColor("#333333").text(`Page: ${pageName}`);
        doc.fontSize(12).fillColor("#666666").text(`Date Range: ${since} to ${until}`);
        doc.moveDown(2);

        // Calculate totals from insightsData
        let totalReach = 0;
        let totalImpressions = 0;
        let totalEngagement = 0;
        let totalEarnings = 0;

        for (const item of insightsData) {
          const val = typeof item.value === "object" ? item.value?.microAmount || 0 : item.value || 0;
          
          if (item.name === "page_impressions_unique") {
            totalReach += Number(val);
          } else if (item.name === "page_impressions") {
            totalImpressions += Number(val);
          } else if (item.name === "page_post_engagements") {
            totalEngagement += Number(val);
          } else if (item.name === "content_monetization_earnings") {
             // It's microAmount, convert to dollars
            totalEarnings += Number(val) / 1000000;
          }
        }

        doc.fontSize(18).fillColor("#000000").text("Summary Metrics");
        doc.moveDown();

        // Draw a simple table/list
        const startX = 50;
        let startY = doc.y;

        const addRow = (label: string, value: string) => {
          doc.fontSize(12).fillColor("#333333").text(label, startX, startY);
          doc.text(value, startX + 200, startY, { align: "right", width: 100 });
          startY += 25;
        };

        addRow("Total Reach:", totalReach.toLocaleString());
        addRow("Total Impressions:", totalImpressions.toLocaleString());
        addRow("Total Engagement:", totalEngagement.toLocaleString());
        addRow("Total CM Earnings:", `$${totalEarnings.toFixed(2)}`);

        doc.moveDown(3);
        doc.fontSize(10).fillColor("#999999").text("Generated automatically by FB Analytics Platform", { align: "center", underline: false });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new ReportService();
