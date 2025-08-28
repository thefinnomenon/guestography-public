import { generateQRTemplate, TemplateStyle } from './qr-templates';

export interface QRTemplateAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function generateQRTemplateAttachments(
  eventId: string,
  eventTitle: string,
  baseUrl: string = 'https://guestography.com',
  selectedStyles: TemplateStyle[] = ['classic', 'celebration']
): Promise<QRTemplateAttachment[]> {
  const attachments: QRTemplateAttachment[] = [];

  for (const style of selectedStyles) {
    try {
      const templateBuffer = await generateQRTemplate({
        eventTitle,
        eventId,
        baseUrl,
        style,
        customMessage: getStyleMessage(style)
      });

      attachments.push({
        filename: `qr-${eventId}-${style}.png`,
        content: templateBuffer,
        contentType: 'image/png'
      });
    } catch (error) {
      console.error(`Failed to generate ${style} template:`, error);
    }
  }

  return attachments;
}

function getStyleMessage(style: TemplateStyle): string {
  switch (style) {
    case 'classic':
      return 'Share your memories with everyone!';
    case 'celebration':
      return 'Help us celebrate with your photos!';
    case 'modern':
      return 'Upload. Share. Remember.';
    case 'elegant':
      return 'Your memories are precious to us';
    case 'minimal':
      return '';
    default:
      return 'Capture and share special moments';
  }
}

export async function generateAllTemplates(
  eventId: string,
  eventTitle: string,
  baseUrl?: string
): Promise<QRTemplateAttachment[]> {
  const allStyles: TemplateStyle[] = ['classic', 'celebration', 'modern', 'elegant', 'minimal'];
  return generateQRTemplateAttachments(eventId, eventTitle, baseUrl, allStyles);
}

export async function generateDefaultTemplates(
  eventId: string,
  eventTitle: string,
  baseUrl?: string
): Promise<QRTemplateAttachment[]> {
  // Generate all templates by default
  const allStyles: TemplateStyle[] = ['classic', 'celebration', 'modern', 'elegant', 'minimal'];
  return generateQRTemplateAttachments(eventId, eventTitle, baseUrl, allStyles);
}