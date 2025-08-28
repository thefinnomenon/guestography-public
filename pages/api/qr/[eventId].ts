import { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { eventId, download } = req.query;

  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Event ID is required" });
  }

  try {
    // Generate the gallery URL
    const baseUrl = req.headers.host?.includes('localhost') 
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;
    
    const galleryUrl = `${baseUrl}/${eventId}`;

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(galleryUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Set headers for image response
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // If download parameter is present, force download
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="qr-code-${eventId}.png"`);
    }
    
    res.status(200).send(qrCodeBuffer);

  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
}