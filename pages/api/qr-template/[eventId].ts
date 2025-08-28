import { NextApiRequest, NextApiResponse } from "next";
import { generateQRTemplate, TemplateStyle } from "../../../lib/qr-templates";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { eventId, style, title, message } = req.query;

  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Event ID is required" });
  }

  try {
    // Parse style parameter
    const templateStyle = (style as TemplateStyle) || 'classic';
    
    // Validate style
    const validStyles = ['classic', 'celebration', 'modern', 'elegant', 'minimal'];
    if (style && !validStyles.includes(templateStyle)) {
      return res.status(400).json({ 
        error: "Invalid style. Choose from: classic, celebration, modern, elegant, minimal" 
      });
    }

    // Get base URL
    const baseUrl = req.headers.host?.includes('localhost') 
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;

    // Generate the template
    const imageBuffer = await generateQRTemplate({
      eventTitle: (title as string) || 'Event Gallery',
      eventId,
      baseUrl,
      style: templateStyle,
      customMessage: message as string
    });

    // Set headers for image download
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-${eventId}-${templateStyle}.png"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(imageBuffer);

  } catch (error) {
    console.error("Error generating QR template:", error);
    res.status(500).json({ error: "Failed to generate QR template" });
  }
}