import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    const { loan_transaction_id } = await req.json();

    if (!loan_transaction_id) {
      return NextResponse.json({ error: "Thiếu loan_transaction_id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("loantransaction")
      .update({ loan_status: "Đã trả" })
      .eq("loan_transaction_id", loan_transaction_id);

    if (error) {
      return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lỗi cập nhật:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
