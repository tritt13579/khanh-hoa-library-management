import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loan_detail_id, copy_id } = body;

    if (!loan_detail_id && !copy_id) {
      return NextResponse.json(
        {
          success: false,
          error: "loan_detail_id or copy_id is required",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Get the book_title_id from the copy
    let bookTitleId: number;

    if (copy_id) {
      const { data: copyData, error: copyError } = await supabase
        .from("bookcopy")
        .select("book_title_id")
        .eq("copy_id", copy_id)
        .single();

      if (copyError) throw copyError;
      bookTitleId = copyData.book_title_id;
    } else {
      // Get from loan detail
      const { data: loanDetail, error: loanError } = await supabase
        .from("loandetail")
        .select(
          `
          bookcopy:copy_id (
            book_title_id
          )
        `
        )
        .eq("loan_detail_id", loan_detail_id)
        .single();

      if (loanError) throw loanError;

      const copyData = Array.isArray(loanDetail.bookcopy)
        ? loanDetail.bookcopy[0]
        : loanDetail.bookcopy;

      bookTitleId = copyData.book_title_id;
    }

    // Delegate triggering to DB RPC which will atomically allocate holds for waiting reservations
    const { data: rpcData, error: rpcError } = await supabase.rpc("trigger_next_for_book", {
      p_book_title_id: bookTitleId,
      p_hold_hours: 24,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({ success: true, data: rpcData });
  } catch (error: any) {
    console.error("Error on book return:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process book return",
      },
      { status: 500 }
    );
  }
}
