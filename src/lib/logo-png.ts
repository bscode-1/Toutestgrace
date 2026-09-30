// src/lib/logo-png.ts — browser-only helper: turns /logo-mark.svg into a PNG data URL for jsPDF.
let cached: string | null = null;

export async function getLogoPngDataUrl(size = 256): Promise<string | null> {
  if (cached) return cached;
  try {
    const res = await fetch("/logo-mark.svg");
    const svgText = await res.text();
    const blobUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo load failed"));
      img.src = blobUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(blobUrl);
    cached = canvas.toDataURL("image/png");
    return cached;
  } catch {
    return null; // PDF export continues without the logo
  }
}