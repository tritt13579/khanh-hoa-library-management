import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

interface BookStatus {
  book: {
    id: number;
    title: string;
    author: string;
    condition: string;
    condition_id: number;
    price: number;
    copy_id: number;
    loan_detail_id: number;
  };
  isSelected: boolean;
  newCondition: number;
  isLost: boolean;
  lateFee: number;
  damageFee: number;
}

export async function POST(request: NextRequest) {
  const supabase = supabaseClient();

  try {
    const {
      loanId,
      readerId,
      booksStatus,
      totalFine,
      paymentMethod,
    }: {
      loanId: number;
      readerId: number;
      booksStatus: BookStatus[];
      totalFine: number;
      paymentMethod: string;
    } = await request.json();

    const selectedBookStatuses = booksStatus.filter(
      (status) => status.isSelected,
    );

    // Generate invoice and receipt numbers
    const generateCode = (prefix: string) =>
      `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Create payment record if there's a fine
    let paymentId = null;
    if (totalFine > 0) {
      const paymentInsert = {
        reader_id: readerId,
        payment_date: new Date().toISOString().split("T")[0],
        amount: totalFine,
        reference_type: "finetransaction",
        payment_method: paymentMethod,
        invoice_no: generateCode("INV"),
        receipt_no: generateCode("RCPT"),
      };

      const { data: paymentData, error: paymentError } = await supabase
        .from("payment")
        .insert(paymentInsert)
        .select();

      if (paymentError) throw paymentError;
      paymentId = paymentData?.[0]?.payment_id;
    }

    // 2. Process each selected book
    for (const bookStatus of selectedBookStatuses) {
      const { book } = bookStatus;

      // Update book condition
      if (bookStatus.newCondition !== book.condition_id) {
        const { error: conditionError } = await supabase
          .from("bookcopy")
          .update({ condition_id: bookStatus.newCondition })
          .eq("copy_id", book.copy_id);
        if (conditionError) throw conditionError;
      }

      // Update return date
      const { error: returnError } = await supabase
        .from("loandetail")
        .update({
          return_date: new Date().toISOString().split("T")[0],
        })
        .eq("loan_detail_id", book.loan_detail_id);
      if (returnError) throw returnError;

      // Trường hợp không thất lạc => cập nhật trạng thái "Có sẵn"
      if (!bookStatus.isLost) {
        const { error: availableError } = await supabase
          .from("bookcopy")
          .update({ availability_status: "Có sẵn" })
          .eq("copy_id", book.copy_id);
        if (availableError) throw availableError;
      }

      // Tạo giao dịch phạt nếu có
      if (bookStatus.lateFee > 0) {
        const { error: lateFeeError } = await supabase
          .from("finetransaction")
          .insert({
            payment_id: paymentId,
            loan_detail_id: book.loan_detail_id,
            fine_type: "Trả trễ",
          });
        if (lateFeeError) throw lateFeeError;
      }

      if (bookStatus.damageFee > 0) {
        const fineType = bookStatus.isLost ? "Thất lạc" : "Bị hư hại";
        const { error: damageFeeError } = await supabase
          .from("finetransaction")
          .insert({
            payment_id: paymentId,
            loan_detail_id: book.loan_detail_id,
            fine_type: fineType,
          });
        if (damageFeeError) throw damageFeeError;

        const newStatus = bookStatus.isLost ? "Thất lạc" : "Có sẵn";
        const { error: statusUpdateError } = await supabase
          .from("bookcopy")
          .update({ availability_status: newStatus })
          .eq("copy_id", book.copy_id);
        if (statusUpdateError) throw statusUpdateError;
      }
    }

    // 3. Check if all books have been returned
    const { data: remainingBooks, error: checkError } = await supabase
      .from("loandetail")
      .select("loan_detail_id")
      .eq("loan_transaction_id", loanId)
      .is("return_date", null);
    if (checkError) throw checkError;

    if (!remainingBooks || remainingBooks.length === 0) {
      const { error: updateLoanError } = await supabase
        .from("loantransaction")
        .update({ loan_status: "Đã trả" })
        .eq("loan_transaction_id", loanId);
      if (updateLoanError) throw updateLoanError;
    }

    // 4. Cộng lại tiền cọc nếu là mượn về
    const { data: loanData, error: loanError } = await supabase
      .from("loantransaction")
      .select("borrow_type")
      .eq("loan_transaction_id", loanId)
      .maybeSingle();
    if (loanError) throw loanError;

    if (loanData?.borrow_type === "Mượn về") {
      const totalBookValue = selectedBookStatuses.reduce((sum, status) => {
        return sum + (status.book.price || 0);
      }, 0);

        if (readerId && totalBookValue > 0) {
          const { data: cardData, error: cardError } = await supabase
            .from("librarycard")
            .select("card_id, current_deposit_balance")
            .eq("reader_id", readerId)
            .maybeSingle();
          if (cardError) throw cardError;

          if (!cardData) {
            throw new Error("Library card not found for reader");
          }

          const updatedBalance =
            (cardData?.current_deposit_balance || 0) + totalBookValue;

          const { error: updateDepositError } = await supabase
            .from("librarycard")
            .update({ current_deposit_balance: updatedBalance })
            .eq("card_id", cardData.card_id);
          if (updateDepositError) throw updateDepositError;
        }
    }

    return NextResponse.json({
      success: true,
      message: "Return processed successfully",
    });
  } catch (error) {
    console.error("Error processing return:", error);
    return NextResponse.json(
      { error: "Failed to process return" },
      { status: 500 },
    );
  }
}
