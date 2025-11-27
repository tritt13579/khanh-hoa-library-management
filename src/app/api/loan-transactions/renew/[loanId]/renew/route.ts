// app/api/loan-transactions/renew/[loanId]/renew/route.ts
import { supabaseClient } from "@/lib/client";
import { NextResponse } from "next/server";
import { format, addDays } from "date-fns";

export async function POST(
  request: Request,
  { params }: { params: { loanId: string } },
) {
  try {
    const loanId = params.loanId;
    const data = await request.json();
    const { currentRenewalCount, renewalDays, dueDate } = data;

    const supabase = supabaseClient();

    // Update only loan details that don't have a return_date (unreturned books)
    const { error: loanDetailError } = await supabase
      .from("loandetail")
      .update({ renewal_count: currentRenewalCount + 1 })
      .eq("loan_transaction_id", loanId)
      .is("return_date", null);

    if (loanDetailError) {
      return NextResponse.json(
        { error: "Failed to update loan details" },
        { status: 500 },
      );
    }

    // Update loan transaction - extend due date
    const currentDueDate = new Date(dueDate);
    const newDueDate = addDays(currentDueDate, renewalDays);

    const { error: loanTransactionError } = await supabase
      .from("loantransaction")
      .update({
        due_date: format(newDueDate, "yyyy-MM-dd"),
        loan_status: "Đang mượn", // Reset status if it was close to overdue
      })
      .eq("loan_transaction_id", loanId);

    if (loanTransactionError) {
      return NextResponse.json(
        { error: "Failed to update loan transaction" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      newDueDate: format(newDueDate, "dd/MM/yyyy"),
    });
  } catch (error) {
    console.error("Error renewing books:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
