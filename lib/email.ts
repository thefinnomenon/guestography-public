import { render } from "@react-email/render";
import { Resend } from "resend";
import DiscountCodeEmail from "../emails/DiscountCodeEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDiscountEmailProps {
  to: string;
  userName: string;
  eventTitle: string;
  discountCode: string;
  eventId: string;
}

export async function sendDiscountCodeEmail({
  to,
  userName,
  eventTitle,
  discountCode,
  eventId,
}: SendDiscountEmailProps) {
  try {
    console.log("📧 Sending discount code email to:", to);

    // Send email using Resend with React Email component
    const { data, error } = await resend.emails.send({
      from: 'Guestography <noreply@guestography.com>',
      to: [to],
      subject: 'Your 50% off discount code - Thanks for sharing!',
      react: DiscountCodeEmail({
        userName,
        eventTitle,
        discountCode,
        eventId,
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("✅ Email sent successfully via Resend:", data?.id);
    return { success: true, emailId: data?.id };

  } catch (error) {
    console.error("Failed to send discount code email:", error);
    throw error;
  }
}