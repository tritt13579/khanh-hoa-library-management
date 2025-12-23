import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reader_id } = body;

  if (!reader_id) {
    return NextResponse.json({ error: "Thiếu reader_id" }, { status: 400 });
  }

  try {
    // 1. Lấy thẻ thư viện và auth_user_id của reader
    const { data: card, error: cardError } = await supabaseAdmin
      .from("librarycard")
      .select("card_id")
      .eq("reader_id", reader_id)
      .single();

    const { data: readerData, error: readerFetchError } = await supabaseAdmin
      .from("reader")
      .select("auth_user_id, photo_url")
      .eq("reader_id", reader_id)
      .maybeSingle();

    if (readerFetchError) {
      console.error("Lỗi lấy reader:", readerFetchError);
      return NextResponse.json({ error: "Không thể lấy thông tin độc giả" }, { status: 500 });
    }

    if (cardError || !card) {
      return NextResponse.json({ error: "Không tìm thấy thẻ thư viện" }, { status: 404 });
    }

    const card_id = card.card_id;
    const authUserId = readerData?.auth_user_id;

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

    // 4. Xóa avatar trên storage
    const photoUrl: string | undefined = readerData?.photo_url;
    if (photoUrl) {
      try {
        const cleaned = photoUrl.split("?")[0].split("#")[0];

        const regexes = [
          /\/storage\/v1\/object\/public\/images\/(.+)$/i,
          /\/object\/public\/images\/(.+)$/i,
          /\/images\/(.+)$/i,
        ];

        let filePath: string | null = null;
        for (const r of regexes) {
          const m = cleaned.match(r);
          if (m && m[1]) {
            filePath = m[1];
            break;
          }
        }

        if (filePath) {
          filePath = decodeURIComponent(filePath.split("?")[0]);
          const { error: removeError } = await supabaseAdmin.storage.from("images").remove([filePath]);
          if (removeError) {
            console.error("Lỗi xóa avatar trên storage:", removeError);
          }
        } else {
          console.warn("Không thể trích xuất đường dẫn file từ photo_url, bỏ qua xóa storage:", photoUrl);
        }
      } catch (e) {
        console.error("Exception khi xóa avatar, tiếp tục xóa DB:", e);
      }
    }

    // 5. Xóa các bản ghi DB
    await supabaseAdmin.from("librarycard").delete().eq("reader_id", reader_id);
    await supabaseAdmin.from("reader").delete().eq("reader_id", reader_id);

    // 6. Nếu có auth_user_id, xóa user trong Supabase Auth (admin)
    if (authUserId) {
      try {
        const delRes: any = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        if (delRes?.error) {
          console.error("Lỗi xóa auth user:", delRes.error);
          return NextResponse.json({ error: "Xóa user auth thất bại" }, { status: 500 });
        }
      } catch (e) {
        console.error("Exception khi xóa auth user:", e);
        return NextResponse.json({ error: "Xóa user auth thất bại" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi xóa reader:", error);
    return NextResponse.json({ error: "Lỗi server nội bộ" }, { status: 500 });
  }
}
