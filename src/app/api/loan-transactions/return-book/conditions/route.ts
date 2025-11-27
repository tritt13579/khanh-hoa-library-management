// api/loan-transactions/return-book/conditions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

export async function GET() {
  const supabase = supabaseClient();

  try {
    const { data, error } = await supabase
      .from("condition")
      .select("*")
      .order("condition_id", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching conditions:", error);
    return NextResponse.json(
      { error: "Failed to fetch conditions" },
      { status: 500 },
    );
  }
}
