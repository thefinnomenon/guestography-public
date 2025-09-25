import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EventCompletionEmailProps {
  eventTitle?: string;
  eventId?: string;
  eventOwnerName?: string;
}

const baseUrl =
  process.env.NODE_ENV === "production"
    ? "https://guestography.com"
    : "http://localhost:3000";

const logoUrl = "https://guestography.com";

export const EventCompletionEmail = ({
  eventTitle = "Your Event",
  eventId = "sample-event",
  eventOwnerName = "Event Host",
}: EventCompletionEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your {eventTitle} gallery is ready! Share the QR code with your guests.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${logoUrl}/logo.png`}
          width="64"
          height="60"
          alt="Guestography"
          style={logo}
        />
        <Heading style={h1}>
          <span
            style={{
              display: "inline-block",
              verticalAlign: "middle",
              paddingBottom: "6px",
              marginRight: "8px",
            }}
          >
            🎉
          </span>
          Your event gallery is ready!
        </Heading>

        <Text style={text}>
          Your <strong>{eventTitle}</strong> gallery is now live and ready for
          guests! Share the QR code below with your guests so they can view and
          upload photos from your event.
        </Text>

        <Section style={attachmentNotice}>
          <Text style={attachmentTitle}>
            📎 <strong>5 Printable QR Card Templates Attached!</strong>
          </Text>
          <Text style={attachmentText}>
            We&apos;ve included 5 beautifully designed QR code cards for your
            event:
          </Text>
          <Text style={attachmentList}>
            • <strong>Classic Template</strong> - Clean, professional design for
            any event
            <br />• <strong>Celebration Template</strong> - Elegant purple theme
            for special occasions
            <br />• <strong>Modern Template</strong> - Sleek dark design with
            geometric accents
            <br />• <strong>Elegant Template</strong> - Sophisticated with
            ornate borders
            <br />• <strong>Minimal Template</strong> - Simple and clean for
            subtle presence
          </Text>
          <Text style={attachmentText}>
            Choose your favorite or print multiple styles! Each is designed for
            4x6&quot; cardstock.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={sharingSection}>
          <Heading style={sharingSectionTitle}>
            🎨 More Ways to Share Your Gallery
          </Heading>

          <Text style={sharingOption}>
            <strong>1. 📱 Share the Link Directly</strong>
            <br />
            Copy and share this link:{" "}
            <a href={`${baseUrl}/${eventId}`} style={directLink}>
              {baseUrl}/{eventId}
            </a>
          </Text>

          <Text style={sharingOption}>
            <strong>2. 🎨 Create Custom Designs with Canva</strong>
            <br />
            Download just the QR code and add it to your own Canva designs:
          </Text>

          <Section style={buttonContainer}>
            <Button
              style={downloadQRButton}
              href={`${baseUrl}/api/qr/${eventId}?download=true`}
            >
              📥 Download Plain QR Code
            </Button>
          </Section>

          <Text style={canvaLinks}>
            <strong>Popular Canva Templates:</strong>
            <br />•{" "}
            <a
              href="https://www.canva.com/templates/search/wedding%20signs/"
              style={canvaLink}
            >
              Wedding Signs
            </a>
            <br />•{" "}
            <a
              href="https://www.canva.com/templates/search/party%20invitations/"
              style={canvaLink}
            >
              Party Invitations
            </a>
            <br />•{" "}
            <a
              href="https://www.canva.com/templates/search/event%20flyers/"
              style={canvaLink}
            >
              Event Flyers
            </a>
            <br />•{" "}
            <a
              href="https://www.canva.com/templates/search/table%20cards/"
              style={canvaLink}
            >
              Table Cards
            </a>
          </Text>

          <Text style={sharingOption}>
            <strong>3. 📋 Share on Social Media</strong>
            <br />
            Post the gallery link in your event group, wedding hashtag, or
            social media stories
          </Text>

          <Text style={sharingOption}>
            <strong>4. 📧 Send to Guests</strong>
            <br />
            Include the gallery link in thank you messages or follow-up emails
            to guests
          </Text>

          <Text style={printingTips}>
            <strong>💡 Printing Tips:</strong>
            <br />
            • Use 80-110lb cardstock for professional results
            <br />
            • Print at actual size (don&apos;t scale to fit)
            <br />• Place QR codes where guests gather: entrance, bar, photo
            booth
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={buttonSection}>
          <Button style={button} href={`${baseUrl}/${eventId}`}>
            View Your Gallery
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Need help? Just reply to this email - we&apos;re here to help!
          <br />
          <br />
          The Guestography Team
          <br />
          <a href="https://guestography.com" style={link}>
            guestography.com
          </a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EventCompletionEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const logo = {
  margin: "0 auto",
  display: "block",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const h2 = {
  color: "#4f46e5",
  fontSize: "20px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "20px 0 10px 0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const printableCard = {
  backgroundColor: "#ffffff",
  border: "3px solid #4f46e5",
  borderRadius: "16px",
  padding: "32px",
  margin: "32px 0",
  textAlign: "center" as const,
  boxShadow: "0 4px 16px rgba(79, 70, 229, 0.1)",
};

const cardHeader = {
  marginBottom: "24px",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: "16px",
};

const cardTitle = {
  color: "#1f2937",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
  lineHeight: "1.2",
};

const cardSubtitle = {
  color: "#6b7280",
  fontSize: "18px",
  fontWeight: "500",
  margin: "0",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const qrContainer = {
  backgroundColor: "#ffffff",
  border: "4px solid #4f46e5",
  borderRadius: "20px",
  padding: "20px",
  margin: "24px auto",
  display: "inline-block",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
};

const qrCode = {
  display: "block",
  margin: "0 auto",
  borderRadius: "8px",
};

const instructionsBox = {
  backgroundColor: "#f0f9ff",
  border: "2px solid #0ea5e9",
  borderRadius: "12px",
  padding: "20px",
  margin: "24px auto",
  maxWidth: "300px",
};

const instructionTitle = {
  color: "#0c4a6e",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
  textAlign: "center" as const,
};

const instructionStep = {
  color: "#0c4a6e",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "4px 0",
  textAlign: "left" as const,
  fontWeight: "500",
};

const printNote = {
  color: "#059669",
  fontSize: "16px",
  fontWeight: "600",
  margin: "20px 0",
  padding: "12px",
  backgroundColor: "#ecfdf5",
  borderRadius: "8px",
  border: "1px solid #10b981",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#4f46e5",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  cursor: "pointer",
  padding: "12px 20px",
};

const linksSection = {
  backgroundColor: "#f9fafb",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
};

const linkText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
  textAlign: "center" as const,
};

const hr = {
  borderColor: "#cccccc",
  margin: "32px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "32px 0 0 0",
};

const link = {
  color: "#4f46e5",
  textDecoration: "underline",
};

const attachmentNotice = {
  backgroundColor: "#f0f9ff",
  border: "2px solid #0ea5e9",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
};

const attachmentTitle = {
  color: "#0c4a6e",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
  textAlign: "center" as const,
};

const attachmentText = {
  color: "#0369a1",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "8px 0",
  textAlign: "center" as const,
};

const attachmentList = {
  color: "#0369a1",
  fontSize: "15px",
  lineHeight: "26px",
  margin: "12px 0",
  textAlign: "left" as const,
  paddingLeft: "20px",
};

const sharingSection = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
};

const sharingSectionTitle = {
  color: "#1f2937",
  fontSize: "20px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 20px 0",
};

const sharingOption = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "16px 0",
};

const directLink = {
  color: "#4f46e5",
  textDecoration: "underline",
  fontWeight: "bold",
  wordBreak: "break-all" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "16px 0",
};

const downloadQRButton = {
  backgroundColor: "#10b981",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  cursor: "pointer",
  padding: "10px 16px",
};

const canvaLinks = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "8px 0 16px 20px",
};

const canvaLink = {
  color: "#059669",
  textDecoration: "underline",
};

const printingTips = {
  backgroundColor: "#fef3c7",
  border: "1px solid #f59e0b",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
  color: "#78350f",
  fontSize: "14px",
  lineHeight: "20px",
};
