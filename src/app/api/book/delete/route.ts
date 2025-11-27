import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("book_title_id");

    if (!bookId) {
      return NextResponse.json({ error: "Thiếu book_title_id" }, { status: 400 });
    }

    // Xóa các quan hệ trước 
    await supabaseAdmin.from("iswrittenby").delete().eq("book_title_id", bookId);
    await supabaseAdmin.from("bookcopy").delete().eq("book_title_id", bookId);

    // Xóa chính booktitle
   const { error } = await supabaseAdmin
        .from("booktitle")
        .delete()
        .eq("book_title_id", bookId);

    if (error) {
        console.error("Lỗi Supabase khi xóa sách:", error.message, error.details);
        return NextResponse.json(
            { error: "Không thể xóa sách", details: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
