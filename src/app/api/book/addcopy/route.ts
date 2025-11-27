import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const bookCopyDataString = formData.get("bookCopyData") as string;

    if (!bookCopyDataString) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu bản sao" },
        { status: 400 },
      );
    }

    const { book_title_id, acquisition_date, price, condition_id } =
      JSON.parse(bookCopyDataString);

    if (!book_title_id || !acquisition_date || !price || !condition_id) {
      return NextResponse.json(
        { error: "Thiếu trường bắt buộc" },
        { status: 400 },
      );
    }

    const { data: newCopy, error: insertError } = await supabaseAdmin
      .from("bookcopy")
      .insert([
        {
          book_title_id,
          acquisition_date,
          price,
          condition_id,
          availability_status: "Có sẵn",
        },
      ])
      .select()
      .single();

    if (insertError || !newCopy) {
      console.error("Chi tiết lỗi Supabase:", insertError?.message);
      return NextResponse.json(
        { error: insertError?.message || "Không thể thêm bản sao" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, copy: newCopy });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xử lý bản sao" },
      { status: 500 },
    );
  }
}
