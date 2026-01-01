// app/api/loan-transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export interface LoanTransactionRequest {
  cardId: number;
  staffId: number;
  bookCopies: number[];
  borrowType: string;
}

export async function POST(req: NextRequest) {
  try {
    // Lấy dữ liệu từ body request
    const data: LoanTransactionRequest = await req.json();
    const { cardId, staffId, bookCopies, borrowType } = data;

    // Kiểm tra dữ liệu đầu vào
    if (
      !cardId ||
      !staffId ||
      !bookCopies ||
      bookCopies.length === 0 ||
      !borrowType
    ) {
      return NextResponse.json(
        { error: "Thiếu thông tin cần thiết" },
        { status: 400 },
      );
    }

    // 1. Kiểm tra trạng thái thẻ thư viện
    const { data: cardData, error: cardError } = await supabaseAdmin
      .from("librarycard")
      .select("card_id, card_status, current_deposit_balance")
      .eq("card_id", cardId)
      .single();

    if (cardError || !cardData) {
      return NextResponse.json(
        { error: "Không tìm thấy thẻ thư viện" },
        { status: 404 },
      );
    }

    if (cardData.card_status !== "Hoạt động") {
      return NextResponse.json(
        { error: "Thẻ thư viện không ở trạng thái hoạt động" },
        { status: 400 },
      );
    }

    const { data: bookCopiesConditionData, error: bookCopiesConditionError } =
      await supabaseAdmin
        .from("bookcopy")
        .select(
          "copy_id, condition_id, condition!inner(condition_name), availability_status",
        )
        .in("copy_id", bookCopies);

    if (bookCopiesConditionError || !bookCopiesConditionData) {
      return NextResponse.json(
        { error: "Lỗi khi kiểm tra tình trạng sách" },
        { status: 500 },
      );
    }

    const damagedBooks = bookCopiesConditionData.filter(
      (book) =>
        Array.isArray(book.condition) &&
        book.condition[0]?.condition_name === "Bị hư hại",
    );

    const unavailableBooks = bookCopiesConditionData.filter(
      (book) => book.availability_status !== "Có sẵn",
    );

    if (unavailableBooks.length > 0) {
      return NextResponse.json(
        {
          error: "Một hoặc nhiều sách không ở trạng thái có thể mượn",
          damagedBooks: damagedBooks.map((book) => book.copy_id),
        },
        { status: 400 },
      );
    }

    // 3. Lấy qui định về số lượng sách được mượn
    const { data: maxBooksSettingData, error: maxBooksSettingError } =
      await supabaseAdmin
        .from("systemsetting")
        .select("setting_value")
        .eq("setting_name", "Qui định mượn sách")
        .single();

    if (maxBooksSettingError || !maxBooksSettingData) {
      return NextResponse.json(
        { error: "Không tìm thấy qui định mượn sách" },
        { status: 500 },
      );
    }

    const maxBooks = parseInt(maxBooksSettingData.setting_value);

    // Kiểm tra số lượng sách đã mượn hiện tại
    const { data: currentLoansData, error: currentLoansError } =
      await supabaseAdmin
        .from("loantransaction")
        .select("loan_transaction_id, loandetail(loan_detail_id, return_date)")
        .eq("card_id", cardId)
        .eq("loan_status", "Đang mượn");

    if (currentLoansError) {
      return NextResponse.json(
        { error: "Lỗi khi kiểm tra sách đang mượn" },
        { status: 500 },
      );
    }

    let currentlyBorrowedBooks = 0;
    currentLoansData?.forEach((loan) => {
      if (loan.loandetail && Array.isArray(loan.loandetail)) {
        const unreturned = loan.loandetail.filter(
          (detail) => detail.return_date === null,
        );
        currentlyBorrowedBooks += unreturned.length;
      }
    });

    // Kiểm tra xem số lượng sách mượn mới có vượt quá qui định không
    if (currentlyBorrowedBooks + bookCopies.length > maxBooks) {
      return NextResponse.json(
        {
          error: `Vượt quá số lượng sách được phép mượn. Hiện tại: ${currentlyBorrowedBooks}, Muốn mượn thêm: ${bookCopies.length}, Tối đa: ${maxBooks}`,
        },
        { status: 400 },
      );
    }

    // Lấy thông tin giá tiền của các sách muốn mượn
    const { data: bookCopiesData, error: bookCopiesError } = await supabaseAdmin
      .from("bookcopy")
      .select("copy_id, price")
      .in("copy_id", bookCopies);

    if (bookCopiesError || !bookCopiesData) {
      return NextResponse.json(
        { error: "Lỗi khi lấy thông tin sách" },
        { status: 500 },
      );
    }

    // Tính tổng giá trị sách muốn mượn
    const totalBookValue = bookCopiesData.reduce(
      (acc, book) => acc + parseFloat(book.price),
      0,
    );

    // 4. Kiểm tra số dư tiền đặt cọc
    if (cardData.current_deposit_balance < totalBookValue) {
      return NextResponse.json(
        {
          error: `Số dư tiền đặt cọc không đủ. Hiện tại: ${cardData.current_deposit_balance}, Cần: ${totalBookValue}`,
        },
        { status: 400 },
      );
    }

    // Lấy thời gian mượn từ cài đặt hệ thống
    const { data: loanPeriodSettingData, error: loanPeriodSettingError } =
      await supabaseAdmin
        .from("systemsetting")
        .select("setting_value")
        .eq("setting_name", "Thời gian mượn")
        .single();

    if (loanPeriodSettingError || !loanPeriodSettingData) {
      return NextResponse.json(
        { error: "Không tìm thấy cài đặt thời gian mượn" },
        { status: 500 },
      );
    }

    const loanPeriodDays = parseInt(loanPeriodSettingData.setting_value);

    // Tạo giao dịch mượn
    const transactionDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanPeriodDays);

    // Pre-check: ensure none of the requested copies are held by other cards
    const { data: existingHolds, error: existingHoldsError } = await supabaseAdmin
      .from("reservation_hold")
      .select("reservation_id, copy_id")
      .in("copy_id", bookCopies.length ? bookCopies : [-1]);

    if (existingHoldsError) {
      return NextResponse.json({ error: "Lỗi khi kiểm tra holds" }, { status: 500 });
    }

    if (existingHolds && existingHolds.length > 0) {
      const reservationIds = existingHolds.map((h: any) => h.reservation_id);
      const { data: reservationsMap, error: reservationsError } = await supabaseAdmin
        .from("reservation")
        .select("reservation_id, card_id")
        .in("reservation_id", reservationIds.length ? reservationIds : [-1]);

      if (reservationsError) {
        return NextResponse.json({ error: "Lỗi khi kiểm tra reservations" }, { status: 500 });
      }

      const heldByOthers: number[] = [];
      const resById: Record<number, any> = {};
      (reservationsMap || []).forEach((r: any) => { resById[r.reservation_id] = r; });

      for (const h of existingHolds) {
        const r = resById[h.reservation_id];
        if (r && r.card_id !== cardId) {
          heldByOthers.push(h.copy_id);
        }
      }

      if (heldByOthers.length > 0) {
        return NextResponse.json(
          { success: false, error: `Không thể mượn vì bản sao ${heldByOthers.join(", ")} đang được giữ bởi thẻ khác` },
          { status: 400 },
        );
      }
    }

    // Bắt đầu giao dịch SupabaseAdminsupabaseAdmin
    const { data: loanTransaction, error: loanTransactionError } =
      await supabaseAdmin
        .from("loantransaction")
        .insert([
          {
            card_id: cardId,
            staff_id: staffId,
            transaction_date: transactionDate.toISOString().split("T")[0],
            due_date: dueDate.toISOString().split("T")[0],
            loan_status: "Đang mượn",
            borrow_type: borrowType,
          },
        ])
        .select()
        .single();

    if (loanTransactionError || !loanTransaction) {
      return NextResponse.json(
        { error: "Lỗi khi tạo giao dịch mượn", details: loanTransactionError },
        { status: 500 },
      );
    }

    // Thêm chi tiết giao dịch mượn cho từng sách
    const loanDetails = bookCopies.map((copyId) => ({
      copy_id: copyId,
      loan_transaction_id: loanTransaction.loan_transaction_id,
      renewal_count: 0,
      return_date: null,
    }));

    const { data: loanDetailData, error: loanDetailError } = await supabaseAdmin
      .from("loandetail")
      .insert(loanDetails)
      .select();

    if (loanDetailError) {
      // Nếu xảy ra lỗi, cần rollback giao dịch mượn
      await supabaseAdmin
        .from("loantransaction")
        .delete()
        .eq("loan_transaction_id", loanTransaction.loan_transaction_id);

      return NextResponse.json(
        {
          error: "Lỗi khi tạo chi tiết giao dịch mượn",
          details: loanDetailError,
        },
        { status: 500 },
      );
    }

    // 5. Cập nhật số dư tiền đặt cọc
    const newDepositBalance = cardData.current_deposit_balance - totalBookValue;
    const { error: updateCardError } = await supabaseAdmin
      .from("librarycard")
      .update({ current_deposit_balance: newDepositBalance })
      .eq("card_id", cardId);

    await supabaseAdmin
      .from("bookcopy")
      .update({ availability_status: "Đang mượn" })
      .in("copy_id", bookCopies);

    if (updateCardError) {
      // Nếu xảy ra lỗi, cần rollback các bước trước đó
      await supabaseAdmin
        .from("loandetail")
        .delete()
        .eq("loan_transaction_id", loanTransaction.loan_transaction_id);

      await supabaseAdmin
        .from("loantransaction")
        .delete()
        .eq("loan_transaction_id", loanTransaction.loan_transaction_id);

      return NextResponse.json(
        {
          error: "Lỗi khi cập nhật số dư tiền đặt cọc",
          details: updateCardError,
        },
        { status: 500 },
      );
    }

    // Check and fulfill any active reservations for the borrowed books
    try {
      // For each borrowed copy, check if it was held for a reservation
      for (const copyId of bookCopies) {
        const { data: holdData, error: holdError } = await supabaseAdmin
          .from("reservation_hold")
          .select("reservation_id, copy_id")
          .eq("copy_id", copyId)
          .single();

        if (holdError) {
          // no hold for this copy or error - continue
          continue;
        }

        const reservationId = holdData?.reservation_id;
        if (!reservationId) continue;

        // Get reservation to verify owner
        const { data: reservationRec, error: reservationError } = await supabaseAdmin
          .from("reservation")
          .select("reservation_id, card_id, reservation_status")
          .eq("reservation_id", reservationId)
          .single();

        if (reservationError || !reservationRec) {
          // remove the stale hold if reservation missing
          await supabaseAdmin.from("reservation_hold").delete().eq("reservation_id", reservationId);
          continue;
        }

        // If the loan is being created for the same card that placed the reservation,
        // mark reservation as fulfilled (Đã mượn). Otherwise, release the hold so next in queue can be triggered.
        if (reservationRec.card_id === cardId) {
          await supabaseAdmin
            .from("reservation")
            .update({ reservation_status: "Đã mượn", expiration_date: null })
            .eq("reservation_id", reservationId);
        } else {
          // This should not happen because we pre-checked holds before creating the loan.
          console.warn(`Copy ${copyId} is held by another card ${reservationRec.card_id} — loan should have been blocked.`);
          // Do not delete the hold; staff must not override holds.
          continue;
        }

        // delete the hold record for this copy if it belonged to this reservation
        await supabaseAdmin.from("reservation_hold").delete().eq("copy_id", copyId);
      }

      // Additionally, trigger processing for affected book titles asynchronously
      const { data: bookTitleData, error: bookTitleError } = await supabaseAdmin
        .from("bookcopy")
        .select("book_title_id")
        .in("copy_id", bookCopies);

      if (!bookTitleError && bookTitleData && bookTitleData.length > 0) {
        const bookTitleIds = [...new Set(bookTitleData.map((b) => b.book_title_id))];
        for (const bookTitleId of bookTitleIds) {
          // call trigger-next endpoint to attempt allocation for waiting reservations
          fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/reservations/trigger-next`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book_title_id: bookTitleId }),
          }).catch((err) => console.error("Error triggering next reservation:", err));
        }
      }
    } catch (error) {
      console.error("Error handling reservation holds after loan:", error);
      // Don't fail the loan if hold handling fails
    }

    // Trả về kết quả thành công
    return NextResponse.json({
      success: true,
      data: {
        loanTransaction,
        loanDetails: loanDetailData,
        newDepositBalance,
      },
    });
  } catch (error) {
    console.error("Error in loan transaction API:", error);
    return NextResponse.json(
      {
        error: "Lỗi server",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
