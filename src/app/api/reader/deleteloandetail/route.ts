import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    const { loan_detail_id } = await req.json();

    if (!loan_detail_id) {
      return NextResponse.json({ error: "Thiếu loan_detail_id" }, { status: 400 });
    }

    // Lấy thông tin loan_detail
    const { data: loanDetail, error: fetchError } = await supabaseAdmin
      .from("loandetail")
      .select("loan_transaction_id")
      .eq("loan_detail_id", loan_detail_id)
      .single();

    if (fetchError || !loanDetail) {
      console.error("Không tìm thấy chi tiết mượn sách:", fetchError);
      return NextResponse.json({ error: "Không tìm thấy chi tiết mượn sách" }, { status: 404 });
    }

    const { loan_transaction_id } = loanDetail;

    // Xóa finetransaction trước 
    const { error: fineDeleteError } = await supabaseAdmin
      .from("finetransaction")
      .delete()
      .eq("loan_detail_id", loan_detail_id); 

    if (fineDeleteError) {
      console.error("Lỗi khi xóa finetransaction:", fineDeleteError.message);
      return NextResponse.json({ error: "Không thể xóa giao dịch phạt" }, { status: 500 });
    }

    // Sau đó mới xóa loan_detail
    const { error: deleteError } = await supabaseAdmin
      .from("loandetail")
      .delete()
      .eq("loan_detail_id", loan_detail_id);

    if (deleteError) {
      console.error("Lỗi khi xóa loan_detail:", deleteError.message, deleteError.details, deleteError.hint);
      return NextResponse.json({ error: deleteError.message || "Xóa chi tiết mượn sách thất bại" }, { status: 500 });
    }

    // Kiểm tra còn sách không
    const { data: remaining, error: checkError } = await supabaseAdmin
      .from("loandetail")
      .select("loan_detail_id")
      .eq("loan_transaction_id", loan_transaction_id);

    if (checkError) {
      console.error("Lỗi khi kiểm tra số lượng còn lại:", checkError);
      return NextResponse.json({ error: "Lỗi khi kiểm tra tình trạng giao dịch" }, { status: 500 });
    }

    // Nếu không còn chi tiết nào => cập nhật trạng thái giao dịch
    if (Array.isArray(remaining) && remaining.length === 0) {
      const { error: updateError } = await supabaseAdmin
        .from("loantransaction")
        .update({ loan_status: "Đã trả" })
        .eq("loan_transaction_id", loan_transaction_id);

      if (updateError) {
        console.error("Lỗi khi cập nhật loan_status:", updateError);
        return NextResponse.json({ error: "Cập nhật trạng thái thất bại" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Lỗi server khi xóa chi tiết:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
