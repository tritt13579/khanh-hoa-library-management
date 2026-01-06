import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { book_title_id } = body;

    if (!book_title_id) {
      return NextResponse.json(
        {
          success: false,
          error: "book_title_id is required",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseClient();

    // Get total copies for this book
    const { data: copies, error: copiesError } = await supabase
      .from("bookcopy")
      .select("copy_id")
      .eq("book_title_id", book_title_id);

    if (copiesError) throw copiesError;

    const totalCopies = copies?.length || 0;

    if (totalCopies === 0) {
      return NextResponse.json({
        success: true,
        data: {
          book_title_id,
          total_copies: 0,
          available_copies: 0,
          checked_out_copies: 0,
          is_reservable: false,
          reason: "Không có bản sao nào của sách này trong thư viện",
        },
      });
    }

    // Get currently checked out copies (loans where return_date is null)
    const { data: loanDetails, error: loanError } = await supabase
      .from("loandetail")
      .select(
        `
        loan_detail_id,
        return_date,
        bookcopy!inner (
          copy_id,
          book_title_id
        )
      `
      )
      .eq("bookcopy.book_title_id", book_title_id)
      .is("return_date", null);

    if (loanError) throw loanError;

    const checkedOutCopies = loanDetails?.length || 0;

    // Count active reservation holds (expires_at > now()) for this book
    const nowIso = new Date().toISOString();
    const { data: holds, error: holdsError } = await supabase
      .from("reservation_hold")
      .select("hold_id, expires_at, bookcopy!inner(copy_id, book_title_id)")
      .eq("bookcopy.book_title_id", book_title_id)
      .gt("expires_at", nowIso);

    if (holdsError) throw holdsError;

    const activeHolds = holds?.length || 0;

    // available copies = total - checked out - active holds
    const availableCopies = Math.max(0, totalCopies - checkedOutCopies - activeHolds);

    // Business rule: held copies are unavailable for pickup, but staff can still
    // create a reservation (it will enter the queue). So `is_reservable` is true
    // when the library has copies of the title at all; `will_hold_if_available`
    // is true only when a free copy exists (after excluding holds and loans).
    const isReservable = totalCopies > 0;
    const willHoldIfAvailable = availableCopies > 0;

    let reason: string | undefined = undefined;
    if (totalCopies === 0) {
      reason = "Không có bản sao nào của sách này trong thư viện";
    } else if (availableCopies > 0) {
      reason = `Có ${availableCopies} bản trên kệ. Nếu bạn đặt trước, hệ thống sẽ giữ 1 bản ngay.`;
    } else {
      reason = `Tất cả bản đều đang được mượn hoặc đã bị giữ. Đặt trước sẽ được xếp vào hàng chờ.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        book_title_id,
        total_copies: totalCopies,
        available_copies: availableCopies,
        checked_out_copies: checkedOutCopies,
        is_reservable: isReservable,
        will_hold_if_available: willHoldIfAvailable,
        reason,
      },
    });
  } catch (error: any) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check book availability",
      },
      { status: 500 }
    );
  }
}
