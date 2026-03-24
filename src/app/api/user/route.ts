import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({ where: { userId } });
  
  if (!user) {
    user = await prisma.user.create({
      data: { userId, credits: 15, plan: "free" }
    });
  }

  return NextResponse.json({
    success: true,
    plan: user.plan,
    credits: user.credits,
    maxCredits: user.plan === "free" ? 15 : 100
  });
}
