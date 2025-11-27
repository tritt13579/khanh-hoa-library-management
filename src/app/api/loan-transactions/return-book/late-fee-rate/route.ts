// api/loan-transactions/return-book/late-fee-rate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

export async function GET() {
  const supabase = supabaseClient();

  try {
    const { data, error } = await supabase
      .from("systemsetting")
      .select("setting_value")
      .eq("setting_name", "Phí phạt chậm trả")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: parseFloat(data.setting_value) });
  } catch (error) {
    console.error("Error fetching late fee rate:", error);
    return NextResponse.json(
      { error: "Failed to fetch late fee rate" },
      { status: 500 },
    );
  }
}
