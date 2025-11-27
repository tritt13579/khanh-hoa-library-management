// app/api/loan-transactions/renew/renewal-settings/route.ts
import { supabaseClient } from "@/lib/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = supabaseClient();

    const { data: maxRenewalsData, error: maxRenewalsError } = await supabase
      .from("systemsetting")
      .select("setting_value")
      .eq("setting_name", "Số lần gia hạn")
      .single();

    const { data: renewalDaysData, error: renewalDaysError } = await supabase
      .from("systemsetting")
      .select("setting_value")
      .eq("setting_name", "Thời gian mượn")
      .single();

    if (maxRenewalsError || renewalDaysError) {
      return NextResponse.json(
        { error: "Failed to fetch renewal settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      maxRenewals: parseInt(maxRenewalsData?.setting_value || "2"),
      renewalDays: parseInt(renewalDaysData?.setting_value || "20"),
    });
  } catch (error) {
    console.error("Error fetching renewal settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
