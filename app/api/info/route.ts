import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      app: "Solar Dashboard",
      version: process.env.npm_package_version || "0.1.0",
      nodeEnv: process.env.NODE_ENV,
      nextVersion: process.env.NEXT_VERSION || "unknown",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
