// api/loan-transactions/return-book/conditions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

export async function POST(request: NextRequest) {
  const supabase = supabaseClient();

  try {
    const { loanId, books } = await request.json();

    const bookDetails = await Promise.all(
      books.map(async (book: any) => {
        const { data: loanDetailData, error } = await supabase
          .from("loandetail")
          .select(
            `
            loan_detail_id,
            copy_id,
            bookcopy(
              copy_id,
              price,
              condition_id,
              availability_status,
              booktitle(
                title
              )
            )
          `,
          )
          .eq("loan_transaction_id", loanId)
          .eq("copy_id", book.id)
          .is("return_date", null);

        if (error || !loanDetailData || loanDetailData.length === 0) {
          console.error("Error fetching loan details:", error);
          return null;
        }

        const loanDetail = loanDetailData[0];
        const bookcopy = loanDetail.bookcopy as any;

        return {
          book: {
            id: loanDetail.loan_detail_id || 0,
            title: book.title,
            author: book.author || "Unknown",
            condition: book.condition || "Unknown",
            condition_id: bookcopy?.condition_id || 1,
            availability_status: bookcopy?.availability_status || "Không rõ",
            price: bookcopy?.price || 0,
            copy_id: loanDetail.copy_id || 0,
            loan_detail_id: loanDetail.loan_detail_id || 0,
          },
        };
      }),
    );

    const validBookDetails = bookDetails.filter((book) => book !== null);

    return NextResponse.json({ data: validBookDetails });
  } catch (error) {
    console.error("Error fetching book details:", error);
    return NextResponse.json(
      { error: "Failed to fetch book details" },
      { status: 500 },
    );
  }
}
