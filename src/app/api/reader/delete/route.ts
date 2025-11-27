import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reader_id } = body;

  if (!reader_id) {
    return NextResponse.json({ error: "Thiếu reader_id" }, { status: 400 });
  }

  try {
    // 1. Lấy thẻ thư viện
    const { data: card, error: cardError } = await supabaseAdmin
      .from("librarycard")
      .select("card_id")
      .eq("reader_id", reader_id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: "Không tìm thấy thẻ thư viện" }, { status: 404 });
    }

    const card_id = card.card_id;

    // 2. Kiểm tra có reservation hay không
    const { data: reservations, error: resvError } = await supabaseAdmin
      .from("reservation")
      .select("reservation_id")
      .eq("card_id", card_id);

    if (resvError) {
      return NextResponse.json({ error: "Không thể kiểm tra reservation" }, { status: 500 });
    }

    if (reservations && reservations.length > 0) {
      return NextResponse.json({ error: "Có hàng đợi đang xử lý" }, { status: 400 });
    }

    // 3. Kiểm tra loantransaction
    const { data: loans, error: loanError } = await supabaseAdmin
      .from("loantransaction")
      .select("loan_status")
      .eq("card_id", card_id);

    if (loanError) {
      return NextResponse.json({ error: "Không thể kiểm tra giao dịch" }, { status: 500 });
    }

    const hasOverdue = loans?.some((loan) => loan.loan_status === "Quá hạn");
    const allReturned = loans?.every((loan) => loan.loan_status === "Đã trả");

    if (hasOverdue) {
      return NextResponse.json({ error: "Còn giao dịch chưa xử lý" }, { status: 400 });
    }

    if (loans && loans.length > 0 && !allReturned) {
      return NextResponse.json({ error: "Có hàng đợi đang xử lý" }, { status: 400 });
    }

    // 4. Xóa các bản ghi
    await supabaseAdmin.from("librarycard").delete().eq("reader_id", reader_id);
    await supabaseAdmin.from("reader").delete().eq("reader_id", reader_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi xóa reader:", error);
    return NextResponse.json({ error: "Lỗi server nội bộ" }, { status: 500 });
  }
}
