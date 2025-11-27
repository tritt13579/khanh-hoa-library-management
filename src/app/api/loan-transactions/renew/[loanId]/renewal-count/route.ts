// app/api/loan-transactions/renew/[loanId]/renewal-count/route.ts
import { supabaseClient } from "@/lib/client";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { loanId: string } },
) {
  try {
    const loanId = params.loanId;
    const supabase = supabaseClient();

    const { data: loanDetails, error } = await supabase
      .from("loandetail")
      .select("renewal_count, return_date")
      .eq("loan_transaction_id", loanId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch loan details" },
        { status: 500 },
      );
    }

    const unreturnedBooks =
      loanDetails?.filter((book) => book.return_date === null) || [];
    const unreturnedBookCount = unreturnedBooks.length;

    const maxRenewalCount = unreturnedBooks.reduce(
      (max, detail) => Math.max(max, detail.renewal_count),
      0,
    );

    return NextResponse.json({
      currentRenewalCount: maxRenewalCount,
      unreturnedBookCount,
      unreturnedBooks,
    });
  } catch (error) {
    console.error("Error checking renewal eligibility:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
