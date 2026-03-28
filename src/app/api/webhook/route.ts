import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // In production, verify the webhook signature from Dodo Payments
    // e.g. verifyWebhook(req.headers.get('x-dodo-signature'), payload)
    
    if (payload.type === "payment.succeeded" || payload.event === "payment.succeeded") {
      const metadata = payload.data?.metadata || payload.metadata || {};
      const userId = metadata.userId || metadata.user_id;
      
      if (!userId) {
        console.warn("[Webhook Warn]: Payment succeeded but no userId found in metadata:", payload);
        return NextResponse.json({ success: false, error: "No userId in metadata" }, { status: 400 });
      }

      await prisma.user.upsert({
        where: { userId },
        update: {
          plan: "lifetime",
          credits: 100 // Upgrade to 100 monthly base
        },
        create: {
          userId,
          plan: "lifetime",
          credits: 100
        }
      });
      console.log(`[Trace Payment] User ${userId} upgraded to LIFETIME.`);
    }

    return NextResponse.json({ success: true, metadata: payload.data?.metadata });
  } catch (err: any) {
    console.error("[Webhook Error]:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
