import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("Starting overdue loan status update...");
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "process_overdue_loans_and_notify",
      { p_due_soon_days: 1 },
    );

    if (rpcError) {
      console.error("RPC process_overdue_loans_and_notify error:", rpcError);
      return NextResponse.json(
        { error: "Failed to process overdue loans", details: rpcError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cron completed",
      data: rpcData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
