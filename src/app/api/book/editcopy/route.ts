// api/book/editcopy/route.ts
import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { copy_id, new_condition_id } = body;

    if (!copy_id || !new_condition_id) {
      return NextResponse.json(
        { error: "Thiếu copy_id hoặc new_condition_id" },
        { status: 400 },
      );
    }

    // Lấy tình trạng hiện tại của bản sao
    const { data: currentCopy, error: fetchError } = await supabaseAdmin
      .from("bookcopy")
      .select("condition_id")
      .eq("copy_id", copy_id)
      .single();

    if (fetchError || !currentCopy) {
      return NextResponse.json(
        { error: "Không tìm thấy bản sao sách hoặc lỗi khi lấy dữ liệu" },
        { status: 404 },
      );
    }

    const current_condition_id = currentCopy.condition_id;

    // Không cho phép cập nhật lên tình trạng tốt hơn
    if (new_condition_id < current_condition_id) {
      return NextResponse.json(
        { error: "Không thể cập nhật sang tình trạng tốt hơn" },
        { status: 400 },
      );
    }

    // Cập nhật nếu hợp lệ
    const { data, error } = await supabaseAdmin
      .from("bookcopy")
      .update({ condition_id: new_condition_id })
      .eq("copy_id", copy_id)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase update error:", error?.message);
      return NextResponse.json(
        { error: error?.message || "Không thể cập nhật bản sao" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, updatedCopy: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật tình trạng" },
      { status: 500 },
    );
  }
}
