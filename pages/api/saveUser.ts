import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { sendDiscountCodeEmail } from "../../lib/email";

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, name, eventId } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const db = admin.firestore();
    
    // Get the event document to retrieve the discount code and event details
    const eventDoc = await db.collection("events").doc(eventId).get();
    const eventData = eventDoc.data();
    
    console.log("Event document exists:", eventDoc.exists);
    console.log("Event data:", eventData);
    console.log("Discount code from event:", eventData?.discountCode);
    
    const discountCode = eventData?.discountCode;
    const eventTitle = eventData?.title;
    
    // Create a new document with auto-generated ID
    const userDocRef = db.collection("users").doc();
    
    await userDocRef.set({
      email: email.toLowerCase(),
      name: name || "Anonymous",
      eventId,
      discountCodeSent: discountCode || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email with discount code if available
    if (discountCode && email) {
      try {
        await sendDiscountCodeEmail({
          to: email.toLowerCase(),
          userName: name || "Guest",
          eventTitle: eventTitle || "Event",
          discountCode: discountCode,
          eventId: eventId,
        });
        
        console.log("Successfully sent discount code email to:", email);
        
      } catch (emailError) {
        console.error("Failed to send discount code email:", emailError);
        // Don't fail the entire operation if email fails
      }
    }

    res.status(200).json({ 
      success: true, 
      userId: userDocRef.id,
      discountCodeSent: !!discountCode
    });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Failed to save user" });
  }
}