import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const { copy_id } = await req.json();

    if (!copy_id) {
      return NextResponse.json(
        { error: "Thiếu copy_id để xóa bản sao" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("bookcopy")
      .delete()
      .eq("copy_id", copy_id);

    if (deleteError) {
      console.error("Lỗi khi xóa bản sao:", deleteError.message);
      return NextResponse.json(
        { error: deleteError.message || "Không thể xóa bản sao" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Đã xóa bản sao thành công" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xóa bản sao" },
      { status: 500 }
    );
  }
}
