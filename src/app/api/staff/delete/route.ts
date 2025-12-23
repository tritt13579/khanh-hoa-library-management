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

    const { data: staffData, error: fetchError } = await supabaseAdmin
      .from("staff")
      .select("auth_user_id")
      .eq("staff_id", staffId)
      .maybeSingle();

    if (fetchError) {
      console.error("Lỗi khi lấy thông tin nhân viên:", fetchError);
      return NextResponse.json({ error: "Không thể lấy thông tin nhân viên" }, { status: 500 });
    }

    const authUserId = staffData?.auth_user_id;

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

    if (authUserId) {
      try {
        const delRes: any = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        if (delRes?.error) {
          console.error("Lỗi xóa auth user cho staff:", delRes.error);
          return NextResponse.json({ error: "Xóa user auth thất bại" }, { status: 500 });
        }
      } catch (e) {
        console.error("Exception khi xóa auth user cho staff:", e);
        return NextResponse.json({ error: "Xóa user auth thất bại" }, { status: 500 });
      }
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
