export function buildPickupWhatsAppUrl(opts: {
  code: string;
  amount?: number | string;
  currency?: string;
  receiverName?: string;
  phone?: string; // optional: digits only, with country code
}) {
  const lines = [
    "TIMS B - Money Transfer",
    opts.receiverName ? `Receiver: ${opts.receiverName}` : null,
    opts.amount !== undefined
      ? `Amount: ${opts.amount}${opts.currency ? " " + opts.currency : ""}`
      : null,
    `Pickup code: ${opts.code}`,
  ].filter(Boolean) as string[];

  const text = encodeURIComponent(lines.join("\n"));
  const base = opts.phone
    ? `https://wa.me/${opts.phone.replace(/\D/g, "")}`
    : "https://wa.me/";
  return `${base}?text=${text}`;
}