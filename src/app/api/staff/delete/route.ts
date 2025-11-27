import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json(
        { error: "Thiếu staffId để xóa" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("staff")
      .delete()
      .eq("staff_id", staffId);

    if (deleteError) {
      console.error("Lỗi khi xóa nhân viên:", deleteError);
      return NextResponse.json(
        { error: "Xóa nhân viên thất bại" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi hệ thống khi xóa nhân viên:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
