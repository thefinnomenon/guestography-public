import { render } from '@react-email/components';
import { EventCompletionEmail } from '../emails/EventCompletionEmail';
import { generateDefaultTemplates, generateAllTemplates } from './email-attachments';
import { TemplateStyle } from './qr-templates';

interface SendCompletionEmailOptions {
  eventTitle: string;
  eventId: string;
  eventOwnerName: string;
  eventOwnerEmail: string;
  baseUrl?: string;
}

export async function sendEventCompletionEmail({
  eventTitle,
  eventId,
  eventOwnerName,
  eventOwnerEmail,
  baseUrl = 'https://guestography.com',
}: SendCompletionEmailOptions) {
  try {
    // Render the email HTML and generate QR template attachments
    const [emailHtml, attachments] = await Promise.all([render(
      EventCompletionEmail({
        eventTitle,
        eventId,
        eventOwnerName
      })), generateAllTemplates(eventId, eventTitle, baseUrl)])

    // Email configuration
    const emailData = {
      to: eventOwnerEmail,
      from: 'noreply@guestography.com',
      subject: `${eventTitle} - Your Event Gallery is Ready! 📸`,
      html: emailHtml,
      attachments: attachments.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      }))
    };

    console.log(`Sending event completion email to ${eventOwnerEmail} for event "${eventTitle}" (${eventId}) with ${attachments.length} attachments.`, emailData);

    return await sendWithResend(emailData);
  } catch (error) {
    console.error('Failed to send event completion email:', error);
    throw error;
  }
}

// Resend implementation (you'll need to install @resend/node)
async function sendWithResend(emailData: any) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  return await resend.emails.send(emailData);
}

// Utility function for quick testing
export async function testEmailGeneration(
  eventId: string = 'test-event',
  eventTitle: string = 'Test Event Gallery'
) {
  const attachments = await generateDefaultTemplates(eventId, eventTitle);
  
  console.log(`Generated ${attachments.length} QR template attachments:`);
  attachments.forEach(attachment => {
    console.log(`- ${attachment.filename} (${attachment.content.length} bytes)`);
  });
  
  return attachments;
}