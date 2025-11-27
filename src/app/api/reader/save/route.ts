import { createClient } from "@/auth/server";
import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    readerId,
    first_name,
    last_name,
    date_of_birth,
    gender,
    address,
    phone,
    email,
    deposit_package_id,
    card_type,
    photo_url,
    payment_date,
    payment_method,
    reference_type,
    invoice_no,
    receipt_no,
    amount,
  } = body;

  if (!email || !first_name || !last_name || !date_of_birth || !gender || !card_type || !amount) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  if (readerId) {
    // 1. Cập nhật độc giả
    const { error: updateReaderError } = await supabaseAdmin
      .from("reader")
      .update({
        first_name,
        last_name,
        date_of_birth,
        gender,
        address,
        phone,
        email,
        photo_url,
      })
      .eq("reader_id", readerId);

    if (updateReaderError) {
      console.error("Lỗi cập nhật độc giả:", updateReaderError);
      return NextResponse.json({ error: "Cập nhật độc giả thất bại" }, { status: 500 });
    }

    // 2. Cập nhật thẻ thư viện
    const { error: updateCardError } = await supabaseAdmin
      .from("librarycard")
      .update({ deposit_package_id, card_type })
      .eq("reader_id", readerId);

    if (updateCardError) {
      console.error("Lỗi cập nhật thẻ thư viện:", updateCardError);
      return NextResponse.json({ error: "Cập nhật thẻ thư viện thất bại" }, { status: 500 });
    }

    // 3. Tạo payment mới (có thể âm)
    if (!payment_date || !payment_method) {
      return NextResponse.json({ error: "Thiếu thông tin payment khi cập nhật" }, { status: 400 });
    }

    const { error: insertPaymentError } = await supabaseAdmin
      .from("payment")
      .insert([{
        reader_id: readerId,
        payment_date,
        amount,
        payment_method,
        reference_type,
        invoice_no,
        receipt_no,
      }]);

    if (insertPaymentError) {
      console.error("Lỗi tạo payment:", insertPaymentError);
      return NextResponse.json({ error: "Tạo payment thất bại khi cập nhật" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // === Trường hợp tạo mới ===

  const { auth } = await createClient();
  const { data: createdUser, error: authError } = await auth.signUp({
    email,
    password: "123456",
    options: {
      data: { role: "reader", full_name: `${first_name} ${last_name}` },
    },
  });

  if (authError || !createdUser?.user?.id) {
    console.error("Lỗi tạo tài khoản:", authError);
    return NextResponse.json({ error: "Tạo tài khoản thất bại" }, { status: 500 });
  }

  const { data: readerData, error: insertReaderError } = await supabaseAdmin
    .from("reader")
    .insert([{
      first_name, last_name, date_of_birth, gender, address, phone, email,
      photo_url, auth_user_id: createdUser.user.id,
    }])
    .select("reader_id");

  if (insertReaderError || !readerData || readerData.length === 0) {
    console.error("Lỗi thêm độc giả:", insertReaderError);
    return NextResponse.json({ error: "Thêm độc giả thất bại" }, { status: 500 });
  }

  const reader_id = readerData[0].reader_id;

  // 3. Lấy thời hạn thẻ
  const { data: settingData, error: settingError } = await supabaseAdmin
    .from("systemsetting")
    .select("setting_value")
    .eq("setting_id", 11)
    .single();

  if (settingError || !settingData) {
    console.error("Lỗi lấy thời hạn thẻ:", settingError);
    return NextResponse.json({ error: "Không lấy được thời hạn thẻ" }, { status: 500 });
  }

  const expiryMonths = parseInt(settingData.setting_value);
  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setMonth(issueDate.getMonth() + expiryMonths);

  // 4. Tạo payment 
  if (!payment_date || !payment_method) {
    return NextResponse.json({ error: "Thiếu thông tin payment" }, { status: 400 });
  }

  if (card_type === "Thẻ mượn") {
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from("depositpackage")
      .select("package_amount")
      .eq("deposit_package_id", deposit_package_id)
      .single();

    if (packageError || !packageData) {
      console.error("Lỗi lấy gói đặt cọc:", packageError);
      return NextResponse.json({ error: "Lấy gói đặt cọc thất bại" }, { status: 500 });
    }
  }

  const { error: insertPaymentError, data: paymentData } = await supabaseAdmin
    .from("payment")
    .insert([{
      reader_id,
      payment_date,
      amount,
      payment_method,
      reference_type,
      invoice_no,
      receipt_no,
    }])
    .select("payment_id")
    .single();

  if (insertPaymentError) {
    console.error("Lỗi tạo payment:", insertPaymentError);
    return NextResponse.json({ error: "Tạo payment thất bại" }, { status: 500 });
  }

  const payment_id = paymentData.payment_id;

  // 5. Tạo thẻ thư viện
  const card_number = `LIB${reader_id.toString().padStart(3, "0")}`;

  const { error: cardError } = await supabaseAdmin.from("librarycard").insert([{
    reader_id,
    deposit_package_id,
    payment_id,
    card_number,
    issue_date: issueDate.toISOString().split("T")[0],
    expiry_date: expiryDate.toISOString().split("T")[0],
    current_deposit_balance: amount,
    card_status: "Hoạt động",
    card_type,
  }]);

  if (cardError) {
    console.error("Lỗi tạo thẻ:", cardError);
    return NextResponse.json({ error: "Tạo thẻ thư viện thất bại" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
