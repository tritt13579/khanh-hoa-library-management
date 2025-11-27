import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { readerId, paymentMethod } = body;

  if (!readerId) {
    return NextResponse.json({ error: "Thiếu readerId" }, { status: 400 });
  }

  // Lấy thông tin thẻ hiện tại
  const { data: card, error: cardError } = await supabaseAdmin
    .from("librarycard")
    .select("card_id, deposit_package_id")
    .eq("reader_id", readerId)
    .in("card_status", ["Hoạt động", "Chưa gia hạn"])
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: "Thẻ không còn hoạt động" }, { status: 404 });
  }

  let refundAmount = 0;

  // Nếu có gói đặt cọc thì truy vấn để lấy số tiền hoàn
  if (card.deposit_package_id) {
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from("depositpackage")
      .select("package_amount")
      .eq("deposit_package_id", card.deposit_package_id)
      .single();

    refundAmount = -deposit!.package_amount;
  }

  // Cập nhật trạng thái thẻ thành "Đã hủy"
  const { error: updateError } = await supabaseAdmin
    .from("librarycard")
    .update({ card_status: "Đã hủy" })
    .eq("card_id", card.card_id);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: "Không thể cập nhật trạng thái thẻ" }, { status: 500 });
  }

  // Tạo giao dịch hoàn tiền (dù là 0)
  const generateCode = (prefix: string) =>
    `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;

  const paymentInsert = {
    reader_id: readerId,
    reference_type: "deposittransaction",
    payment_method: paymentMethod,
    payment_date: new Date().toISOString(),
    amount: refundAmount,
    invoice_no: generateCode("INV"),
    receipt_no: generateCode("RCPT"),
  };

  const { error: paymentError } = await supabaseAdmin
    .from("payment")
    .insert(paymentInsert);

  if (paymentError) {
    console.error(paymentError);
    return NextResponse.json({ error: "Không thể tạo giao dịch hoàn tiền" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Thẻ đã bị hủy và hoàn tiền thành công" });
}
