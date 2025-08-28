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

interface DiscountCodeEmailProps {
  userName?: string;
  eventTitle?: string;
  discountCode?: string;
  eventId?: string;
}

const baseUrl =
  process.env.NODE_ENV === "production"
    ? "https://guestography.com"
    : "http://localhost:3000";

const logoUrl = "https://guestography.com";

export const DiscountCodeEmail = ({
  userName = "Guest",
  eventTitle = "Your Event",
  discountCode = "DISCOUNT50",
  eventId = "sample-event",
}: DiscountCodeEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your 50% discount code for Guestography - Thanks for sharing your
      memories!
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
            📸
          </span>
          Thanks for sharing your memories!
        </Heading>
        <Text style={text}>
          Thank you for contributing to the <strong>{eventTitle}</strong>{" "}
          gallery! Your photos and videos help capture those special moments
          that everyone will treasure forever.
        </Text>

        <Section style={discountSection}>
          <Heading style={h2}>
            Here&apos;s your exclusive 50% off discount!
          </Heading>
          <Text style={discountText}>
            Use this code when creating your next Guestography event:
          </Text>
          <Text style={discountCodeStyle}>{discountCode}</Text>
          <Text style={smallText}>
            This code gives you 50% off your next event - perfect for weddings,
            parties, corporate events, and more!
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={buttonSection}>
          <Button
            style={button}
            href={`${baseUrl}/event?discount=${discountCode}`}
          >
            Create Your Next Event
          </Button>
        </Section>

        <Text style={footer}>
          Questions? Just reply to this email - we&apos;d love to help!
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

export default DiscountCodeEmail;

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

const discountSection = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const discountText = {
  color: "#4a5568",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const discountCodeStyle = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  letterSpacing: "2px",
  fontFamily: "Monaco, Consolas, monospace",
  margin: "16px 0",
  textAlign: "center" as const,
  backgroundColor: "#4f46e5",
  borderRadius: "8px",
  padding: "16px 24px",
  display: "block",
};

const smallText = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "8px 0 0 0",
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
