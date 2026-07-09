import { Resend } from "resend";
import PurchaseNotificationEmail from "../emails/PurchaseNotificationEmail";

interface SendPurchaseNotificationEmailOptions {
  eventTitle: string;
  eventId: string;
  ownerName: string;
  ownerEmail: string;
  amountTotal?: number | null;
  amountSubtotal?: number | null;
  currency?: string | null;
  stripeSessionId: string;
  discountApplied: boolean;
  baseUrl?: string;
}

const DEFAULT_NOTIFICATION_EMAIL = "chris@guestography.com";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatCurrency(amount: number | null | undefined, currency = "usd") {
  if (typeof amount !== "number") {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getRecipients() {
  const rawRecipients =
    process.env.PURCHASE_NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL;

  return rawRecipients
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

export async function sendPurchaseNotificationEmail({
  eventTitle,
  eventId,
  ownerName,
  ownerEmail,
  amountTotal,
  amountSubtotal,
  currency = "usd",
  stripeSessionId,
  discountApplied,
  baseUrl = "https://guestography.com",
}: SendPurchaseNotificationEmailOptions) {
  const recipients = getRecipients();

  if (!recipients.length) {
    console.warn("No purchase notification recipients configured");
    return { skipped: true };
  }

  const normalizedCurrency = currency || "usd";
  const total = formatCurrency(amountTotal, normalizedCurrency);
  const subtotal = formatCurrency(amountSubtotal, normalizedCurrency);
  const discountAmount =
    discountApplied &&
    typeof amountTotal === "number" &&
    typeof amountSubtotal === "number"
      ? formatCurrency(amountSubtotal - amountTotal, normalizedCurrency)
      : undefined;

  const { data, error } = await resend.emails.send({
    from: "Guestography <noreply@guestography.com>",
    to: recipients,
    subject: `New Guestography purchase: ${eventTitle}`,
    react: PurchaseNotificationEmail({
      eventTitle,
      eventId,
      ownerName,
      ownerEmail,
      amountTotal: total,
      amountSubtotal: subtotal,
      discountAmount,
      stripeSessionId,
      galleryUrl: `${baseUrl}/${eventId}`,
    }),
  });

  if (error) {
    throw new Error(`Failed to send purchase notification: ${error.message}`);
  }

  return { success: true, emailId: data?.id, recipients };
}
