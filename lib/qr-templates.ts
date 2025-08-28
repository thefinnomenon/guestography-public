import { createCanvas, loadImage, registerFont } from 'canvas';
import QRCode from 'qrcode';

export type TemplateStyle = 'classic' | 'celebration' | 'modern' | 'elegant' | 'minimal';

interface TemplateConfig {
  eventTitle: string;
  eventId: string;
  baseUrl?: string;
  style?: TemplateStyle;
  customMessage?: string;
}

const CARD_WIDTH = 1200;  // 4 inches at 300 DPI
const CARD_HEIGHT = 1800; // 6 inches at 300 DPI
const QR_SIZE = 600;      // 2 inches at 300 DPI

export async function generateQRTemplate({
  eventTitle,
  eventId,
  baseUrl = 'https://guestography.com',
  style = 'classic',
  customMessage
}: TemplateConfig): Promise<Buffer> {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Generate QR code
  const galleryUrl = `${baseUrl}/${eventId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(galleryUrl, {
    width: QR_SIZE,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // Apply template style
  switch (style) {
    case 'classic':
      await drawClassicTemplate(ctx, eventTitle, qrCodeDataUrl, customMessage);
      break;
    case 'celebration':
      await drawCelebrationTemplate(ctx, eventTitle, qrCodeDataUrl, customMessage);
      break;
    case 'modern':
      await drawModernTemplate(ctx, eventTitle, qrCodeDataUrl, customMessage);
      break;
    case 'elegant':
      await drawElegantTemplate(ctx, eventTitle, qrCodeDataUrl, customMessage);
      break;
    case 'minimal':
      await drawMinimalTemplate(ctx, eventTitle, qrCodeDataUrl, customMessage);
      break;
  }

  return canvas.toBuffer('image/png');
}

async function drawClassicTemplate(
  ctx: any,
  eventTitle: string,
  qrCodeDataUrl: string,
  customMessage?: string
) {
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Purple header
  ctx.fillStyle = '#4F46E5';
  ctx.fillRect(0, 0, CARD_WIDTH, 300);

  // Event title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(eventTitle, CARD_WIDTH / 2, 180);

  // Subtitle
  ctx.font = '36px sans-serif';
  ctx.fillText('Photo Gallery', CARD_WIDTH / 2, 250);

  // QR code container
  const qrImage = await loadImage(qrCodeDataUrl);
  const qrX = (CARD_WIDTH - QR_SIZE) / 2;
  const qrY = 400;
  
  // QR code border
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 8;
  ctx.strokeRect(qrX - 20, qrY - 20, QR_SIZE + 40, QR_SIZE + 40);
  
  // Draw QR code
  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  // Instructions
  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('📱 Scan to View & Upload', CARD_WIDTH / 2, qrY + QR_SIZE + 120);

  // Steps
  ctx.font = '36px sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.textAlign = 'left';
  const stepsY = qrY + QR_SIZE + 200;
  const stepsX = 200;
  
  ctx.fillText('1. Open your phone camera', stepsX, stepsY);
  ctx.fillText('2. Point at this QR code', stepsX, stepsY + 60);
  ctx.fillText('3. Tap the notification', stepsX, stepsY + 120);
  ctx.fillText('4. Upload your photos!', stepsX, stepsY + 180);

  // Custom message or default
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  const message = customMessage || 'Share your memories with everyone!';
  ctx.fillText(message, CARD_WIDTH / 2, CARD_HEIGHT - 150);

  // Footer
  ctx.fillStyle = '#8B5CF6';
  ctx.font = '32px sans-serif';
  ctx.fillText('Powered by Guestography', CARD_WIDTH / 2, CARD_HEIGHT - 60);
}

async function drawCelebrationTemplate(
  ctx: any,
  eventTitle: string,
  qrCodeDataUrl: string,
  customMessage?: string
) {
  // Soft gradient background - more elegant
  const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  gradient.addColorStop(0, '#FDF4FF');
  gradient.addColorStop(0.5, '#FAE8FF');
  gradient.addColorStop(1, '#F3E8FF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle decorative elements
  ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
  ctx.beginPath();
  ctx.arc(200, 150, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CARD_WIDTH - 200, CARD_HEIGHT - 200, 140, 0, Math.PI * 2);
  ctx.fill();

  // Elegant top border
  ctx.fillStyle = '#A855F7';
  ctx.fillRect(0, 0, CARD_WIDTH, 12);
  
  // Title - more refined
  ctx.fillStyle = '#581C87';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(eventTitle, CARD_WIDTH / 2, 180);

  // Decorative line
  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 220);
  ctx.lineTo(CARD_WIDTH - 300, 220);
  ctx.stroke();

  // Subtitle
  ctx.fillStyle = '#7C3AED';
  ctx.font = '36px sans-serif';
  ctx.fillText('Share Your Joy!', CARD_WIDTH / 2, 280);

  // QR code with elegant frame
  const qrImage = await loadImage(qrCodeDataUrl);
  const qrX = (CARD_WIDTH - QR_SIZE) / 2;
  const qrY = 360;
  
  // Elegant border with rounded corners effect
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX - 25, qrY - 25, QR_SIZE + 50, QR_SIZE + 50);
  
  ctx.strokeStyle = '#A855F7';
  ctx.lineWidth = 6;
  ctx.strokeRect(qrX - 20, qrY - 20, QR_SIZE + 40, QR_SIZE + 40);
  
  // Inner decorative corners
  ctx.fillStyle = '#C084FC';
  const cornerSize = 20;
  // Top left
  ctx.fillRect(qrX - 15, qrY - 15, cornerSize, 4);
  ctx.fillRect(qrX - 15, qrY - 15, 4, cornerSize);
  // Top right  
  ctx.fillRect(qrX + QR_SIZE + 15 - cornerSize, qrY - 15, cornerSize, 4);
  ctx.fillRect(qrX + QR_SIZE + 15 - 4, qrY - 15, 4, cornerSize);
  // Bottom left
  ctx.fillRect(qrX - 15, qrY + QR_SIZE + 15 - 4, cornerSize, 4);
  ctx.fillRect(qrX - 15, qrY + QR_SIZE + 15 - cornerSize, 4, cornerSize);
  // Bottom right
  ctx.fillRect(qrX + QR_SIZE + 15 - cornerSize, qrY + QR_SIZE + 15 - 4, cornerSize, 4);
  ctx.fillRect(qrX + QR_SIZE + 15 - 4, qrY + QR_SIZE + 15 - cornerSize, 4, cornerSize);
  
  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  // Call to action - more elegant
  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('Capture & Share Memories', CARD_WIDTH / 2, qrY + QR_SIZE + 100);

  // Instructions
  ctx.font = '32px sans-serif';
  ctx.fillStyle = '#6B21A8';
  ctx.fillText('Scan with your camera to upload photos', CARD_WIDTH / 2, qrY + QR_SIZE + 160);

  // Message
  ctx.fillStyle = '#A855F7';
  ctx.font = '36px sans-serif';
  const message = customMessage || 'Help us celebrate together!';
  ctx.fillText(message, CARD_WIDTH / 2, qrY + QR_SIZE + 220);

  // Bottom elegant decoration
  ctx.fillStyle = '#C084FC';
  ctx.font = '32px sans-serif';
  ctx.fillText('♦ ♦ ♦', CARD_WIDTH / 2, CARD_HEIGHT - 120);
  
  ctx.fillStyle = '#9333EA';
  ctx.font = '28px sans-serif';
  ctx.fillText('Powered by Guestography', CARD_WIDTH / 2, CARD_HEIGHT - 60);
}

async function drawModernTemplate(
  ctx: any,
  eventTitle: string,
  qrCodeDataUrl: string,
  customMessage?: string
) {
  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, '#1F2937');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Geometric accent
  ctx.fillStyle = '#8B5CF6';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(CARD_WIDTH, 0);
  ctx.lineTo(CARD_WIDTH, 200);
  ctx.lineTo(0, 300);
  ctx.closePath();
  ctx.fill();

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 78px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(eventTitle, CARD_WIDTH / 2, 140);

  // Modern subtitle
  ctx.fillStyle = '#E9D5FF';
  ctx.font = '36px sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('DIGITAL GALLERY', CARD_WIDTH / 2, 220);

  // QR code with glow effect
  const qrImage = await loadImage(qrCodeDataUrl);
  const qrX = (CARD_WIDTH - QR_SIZE) / 2;
  const qrY = 400;
  
  // Glow effect
  ctx.shadowColor = '#8B5CF6';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX - 20, qrY - 20, QR_SIZE + 40, QR_SIZE + 40);
  ctx.shadowBlur = 0;
  
  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  // Tech-style instructions
  ctx.fillStyle = '#A78BFA';
  ctx.font = '42px monospace';
  ctx.fillText('[ SCAN TO ACCESS ]', CARD_WIDTH / 2, qrY + QR_SIZE + 100);

  // Message
  ctx.fillStyle = '#E9D5FF';
  ctx.font = '36px sans-serif';
  const message = customMessage || 'Upload. Share. Remember.';
  ctx.fillText(message, CARD_WIDTH / 2, qrY + QR_SIZE + 180);

  // Bottom accent
  ctx.fillStyle = '#8B5CF6';
  ctx.fillRect(200, CARD_HEIGHT - 100, CARD_WIDTH - 400, 4);
  
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '28px sans-serif';
  ctx.fillText('guestography.com', CARD_WIDTH / 2, CARD_HEIGHT - 40);
}

async function drawElegantTemplate(
  ctx: any,
  eventTitle: string,
  qrCodeDataUrl: string,
  customMessage?: string
) {
  // Cream background
  ctx.fillStyle = '#FAF5F0';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Decorative border
  ctx.strokeStyle = '#D4A574';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80);
  
  // Inner border
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, CARD_WIDTH - 120, CARD_HEIGHT - 120);

  // Elegant title
  ctx.fillStyle = '#5C4033';
  ctx.font = 'italic 72px serif';
  ctx.textAlign = 'center';
  ctx.fillText(eventTitle, CARD_WIDTH / 2, 200);

  // Decorative line
  ctx.strokeStyle = '#D4A574';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, 250);
  ctx.lineTo(CARD_WIDTH - 300, 250);
  ctx.stroke();

  // Subtitle
  ctx.fillStyle = '#8B7355';
  ctx.font = '36px serif';
  ctx.fillText('Guest Photo Collection', CARD_WIDTH / 2, 320);

  // QR code with ornate frame
  const qrImage = await loadImage(qrCodeDataUrl);
  const qrX = (CARD_WIDTH - QR_SIZE) / 2;
  const qrY = 400;
  
  // Ornate corners
  ctx.strokeStyle = '#D4A574';
  ctx.lineWidth = 4;
  const cornerSize = 40;
  
  // Top left corner
  ctx.beginPath();
  ctx.moveTo(qrX - 20, qrY - 20 + cornerSize);
  ctx.lineTo(qrX - 20, qrY - 20);
  ctx.lineTo(qrX - 20 + cornerSize, qrY - 20);
  ctx.stroke();
  
  // Top right corner
  ctx.beginPath();
  ctx.moveTo(qrX + QR_SIZE + 20 - cornerSize, qrY - 20);
  ctx.lineTo(qrX + QR_SIZE + 20, qrY - 20);
  ctx.lineTo(qrX + QR_SIZE + 20, qrY - 20 + cornerSize);
  ctx.stroke();
  
  // Bottom left corner
  ctx.beginPath();
  ctx.moveTo(qrX - 20, qrY + QR_SIZE + 20 - cornerSize);
  ctx.lineTo(qrX - 20, qrY + QR_SIZE + 20);
  ctx.lineTo(qrX - 20 + cornerSize, qrY + QR_SIZE + 20);
  ctx.stroke();
  
  // Bottom right corner
  ctx.beginPath();
  ctx.moveTo(qrX + QR_SIZE + 20 - cornerSize, qrY + QR_SIZE + 20);
  ctx.lineTo(qrX + QR_SIZE + 20, qrY + QR_SIZE + 20);
  ctx.lineTo(qrX + QR_SIZE + 20, qrY + QR_SIZE + 20 - cornerSize);
  ctx.stroke();
  
  // White background for QR
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX - 10, qrY - 10, QR_SIZE + 20, QR_SIZE + 20);
  
  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  // Elegant instruction
  ctx.fillStyle = '#5C4033';
  ctx.font = 'italic 42px serif';
  ctx.fillText('Please scan to share your photos', CARD_WIDTH / 2, qrY + QR_SIZE + 100);

  // Custom message
  ctx.fillStyle = '#8B7355';
  ctx.font = '32px serif';
  const message = customMessage || 'Your memories are precious to us';
  ctx.fillText(message, CARD_WIDTH / 2, qrY + QR_SIZE + 180);

  // Footer with flourish
  ctx.fillStyle = '#A0896E';
  ctx.font = '28px serif';
  ctx.fillText('♦ ♦ ♦', CARD_WIDTH / 2, CARD_HEIGHT - 140);
  ctx.fillText('Guestography', CARD_WIDTH / 2, CARD_HEIGHT - 90);
}

async function drawMinimalTemplate(
  ctx: any,
  eventTitle: string,
  qrCodeDataUrl: string,
  customMessage?: string
) {
  // Pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Simple title
  ctx.fillStyle = '#000000';
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(eventTitle, CARD_WIDTH / 2, 200);

  // Thin line
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(400, 260);
  ctx.lineTo(CARD_WIDTH - 400, 260);
  ctx.stroke();

  // QR code - clean, no border
  const qrImage = await loadImage(qrCodeDataUrl);
  const qrX = (CARD_WIDTH - QR_SIZE) / 2;
  const qrY = 360;
  
  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  // Minimal instruction
  ctx.fillStyle = '#6B7280';
  ctx.font = '32px sans-serif';
  ctx.fillText('Scan. Upload. Share.', CARD_WIDTH / 2, qrY + QR_SIZE + 80);

  // Custom message if provided
  if (customMessage) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '28px sans-serif';
    ctx.fillText(customMessage, CARD_WIDTH / 2, qrY + QR_SIZE + 140);
  }

  // Subtle footer
  ctx.fillStyle = '#E5E7EB';
  ctx.font = '24px sans-serif';
  ctx.fillText('guestography', CARD_WIDTH / 2, CARD_HEIGHT - 60);
}