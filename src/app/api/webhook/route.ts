import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // In production, verify the webhook signature from Dodo Payments
    // e.g. verifyWebhook(req.headers.get('x-dodo-signature'), payload)
    
    if (payload.type === "payment.succeeded") {
      const { userId } = payload.data.metadata;
      
      await prisma.user.update({
        where: { userId },
        data: {
          plan: "pro",
          credits: 100 // Boost to 100 monthly
        }
      });
      console.log(`[Trace Payment] User ${userId} upgraded to PRO.`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Webhook Error]:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
