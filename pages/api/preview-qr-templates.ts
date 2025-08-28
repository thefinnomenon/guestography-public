import { NextApiRequest, NextApiResponse } from "next";
import { TemplateStyle } from "../../lib/qr-templates";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const styles: TemplateStyle[] = ['classic', 'celebration', 'modern', 'elegant', 'minimal'];
  const eventId = 'sample-event';
  const eventTitle = 'Sarah & John\'s Wedding';
  
  const baseUrl = req.headers.host?.includes('localhost') 
    ? `http://${req.headers.host}`
    : `https://${req.headers.host}`;

  // Generate HTML page with all templates
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>QR Template Preview - Guestography</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(to bottom, #f3f4f6, #e5e7eb);
          padding: 40px 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 {
          text-align: center;
          color: #1f2937;
          margin-bottom: 20px;
          font-size: 2.5rem;
        }
        .subtitle {
          text-align: center;
          color: #6b7280;
          margin-bottom: 40px;
          font-size: 1.1rem;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 30px;
          margin-bottom: 40px;
        }
        .template-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .template-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
        }
        .template-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        .template-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .template-description {
          font-size: 0.9rem;
          opacity: 0.9;
        }
        .template-preview {
          padding: 20px;
          text-align: center;
          background: #f9fafb;
        }
        .template-image {
          width: 100%;
          max-width: 300px;
          height: auto;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
        }
        .download-section {
          padding: 20px;
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .download-btn {
          padding: 10px 20px;
          background: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .download-btn:hover {
          background: #4338ca;
        }
        .view-btn {
          padding: 10px 20px;
          background: #10b981;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .view-btn:hover {
          background: #059669;
        }
        .info-box {
          background: white;
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 40px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .info-title {
          color: #1f2937;
          font-size: 1.3rem;
          margin-bottom: 15px;
        }
        .info-text {
          color: #4b5563;
          line-height: 1.6;
        }
        .print-tips {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .print-tips h3 {
          color: #92400e;
          margin-bottom: 10px;
        }
        .print-tips ul {
          color: #78350f;
          margin-left: 20px;
        }
        .print-tips li {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>QR Code Template Gallery</h1>
        <p class="subtitle">Preview and download printable QR code cards for your event</p>
        
        <div class="info-box">
          <h2 class="info-title">About These Templates</h2>
          <p class="info-text">
            Each template is designed to be printed on 4x6 inch cardstock at 300 DPI for professional quality. 
            Choose the style that best matches your event theme. You can customize the event title and message 
            when generating your actual templates.
          </p>
          <div class="print-tips">
            <h3>📌 Printing Tips:</h3>
            <ul>
              <li>Use heavy cardstock (80-110 lb) for best results</li>
              <li>Print at actual size (do not scale)</li>
              <li>Select "High Quality" or "Photo" print setting</li>
              <li>Place cards at registration table, bar, or photo booth</li>
              <li>Consider laminating for outdoor events</li>
            </ul>
          </div>
        </div>
        
        <div class="grid">
          ${styles.map(style => {
            const descriptions = {
              classic: 'Clean and professional design with clear instructions',
              celebration: 'Festive and fun with decorative elements',
              modern: 'Sleek dark theme with geometric accents',
              elegant: 'Sophisticated design perfect for formal events',
              minimal: 'Simple and clean for a subtle presence'
            };
            
            return `
              <div class="template-card">
                <div class="template-header">
                  <div class="template-title">${style.charAt(0).toUpperCase() + style.slice(1)} Template</div>
                  <div class="template-description">${descriptions[style]}</div>
                </div>
                <div class="template-preview">
                  <img 
                    src="${baseUrl}/api/qr-template/${eventId}?style=${style}&title=${encodeURIComponent(eventTitle)}" 
                    alt="${style} template preview" 
                    class="template-image"
                    loading="lazy"
                  />
                </div>
                <div class="download-section">
                  <a 
                    href="${baseUrl}/api/qr-template/${eventId}?style=${style}&title=${encodeURIComponent(eventTitle)}" 
                    download="qr-${style}.png" 
                    class="download-btn"
                  >
                    ⬇ Download
                  </a>
                  <a 
                    href="${baseUrl}/api/qr-template/${eventId}?style=${style}&title=${encodeURIComponent(eventTitle)}" 
                    target="_blank" 
                    class="view-btn"
                  >
                    🔍 Full Size
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}