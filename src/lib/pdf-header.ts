import { getLogoPngDataUrl } from "@/lib/logo-png";

export const COMPANY_NAME = "TIMS B";

// Call right after `const doc = new jsPDF()`. Returns the Y position to start your table at.
export async function addPdfHeader(doc: any, title: string, subtitle?: string): Promise<number> {
  const logo = await getLogoPngDataUrl();
  if (logo) doc.addImage(logo, "PNG", 14, 10, 14, 14);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_NAME, logo ? 32 : 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, logo ? 32 : 14, 24);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 31);
  }
  return subtitle ? 36 : 30;
}