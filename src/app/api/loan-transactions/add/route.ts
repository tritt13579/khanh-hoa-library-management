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
