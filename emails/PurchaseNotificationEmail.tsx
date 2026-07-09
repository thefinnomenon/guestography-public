import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface PurchaseNotificationEmailProps {
  eventTitle: string;
  eventId: string;
  ownerName: string;
  ownerEmail: string;
  amountTotal: string;
  amountSubtotal: string;
  discountAmount?: string;
  stripeSessionId: string;
  galleryUrl: string;
}

export const PurchaseNotificationEmail = ({
  eventTitle,
  eventId,
  ownerName,
  ownerEmail,
  amountTotal,
  amountSubtotal,
  discountAmount,
  stripeSessionId,
  galleryUrl,
}: PurchaseNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>New Guestography purchase completed for {eventTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New purchase completed</Heading>

        <Section style={summary}>
          <Text style={summaryAmount}>{amountTotal}</Text>
          <Text style={muted}>Guestography Gallery</Text>
        </Section>

        <Text style={text}>
          A customer completed payment for <strong>{eventTitle}</strong>.
        </Text>

        <Section style={details}>
          <Text style={detailRow}>
            <strong>Customer:</strong> {ownerName}
          </Text>
          <Text style={detailRow}>
            <strong>Email:</strong>{" "}
            <Link href={`mailto:${ownerEmail}`} style={link}>
              {ownerEmail}
            </Link>
          </Text>
          <Text style={detailRow}>
            <strong>Event ID:</strong> {eventId}
          </Text>
          <Text style={detailRow}>
            <strong>Subtotal:</strong> {amountSubtotal}
          </Text>
          {discountAmount ? (
            <Text style={detailRow}>
              <strong>Discount:</strong> {discountAmount}
            </Text>
          ) : null}
          <Text style={detailRow}>
            <strong>Stripe session:</strong> {stripeSessionId}
          </Text>
        </Section>

        <Text style={text}>
          Gallery:{" "}
          <Link href={galleryUrl} style={link}>
            {galleryUrl}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PurchaseNotificationEmail;

const main = {
  backgroundColor: "#f6f8fb",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "32px 20px 48px",
  maxWidth: "560px",
};

const h1 = {
  color: "#111827",
  fontSize: "24px",
  lineHeight: "32px",
  margin: "0 0 24px",
};

const summary = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "20px",
  margin: "0 0 24px",
};

const summaryAmount = {
  color: "#111827",
  fontSize: "32px",
  fontWeight: "700",
  lineHeight: "40px",
  margin: "0",
};

const muted = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "4px 0 0",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const details = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "24px 0",
};

const detailRow = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "8px 0",
};

const link = {
  color: "#4f46e5",
  textDecoration: "underline",
};
