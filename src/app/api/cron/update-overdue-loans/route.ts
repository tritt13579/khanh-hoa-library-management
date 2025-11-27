import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("Starting overdue loan status update...");

    // Bước 1: Tìm các loan transaction có sách chưa trả và đã quá hạn
    const { data: overdueLoans, error: fetchError } = await supabase
      .from("loantransaction")
      .select(
        `
        loan_transaction_id,
        due_date,
        loan_status,
        loandetail!inner(
          loan_detail_id,
          return_date
        )
      `,
      )
      .lt("due_date", new Date().toISOString().split("T")[0])
      .in("loan_status", ["Đang mượn"])
      .is("loandetail.return_date", null);

    if (fetchError) {
      console.error("Error fetching overdue loans:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch overdue loans", details: fetchError.message },
        { status: 500 },
      );
    }

    if (!overdueLoans || overdueLoans.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No overdue loans found",
        updatedLoans: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Bước 2: Lấy danh sách ID của các loan transaction cần cập nhật
    const loanTransactionIds = overdueLoans.map(
      (loan) => loan.loan_transaction_id,
    );

    // Bước 3: Cập nhật loan_status thành "Quá hạn"
    const { data: updatedData, error: updateError } = await supabase
      .from("loantransaction")
      .update({
        loan_status: "Quá hạn",
      })
      .in("loan_transaction_id", loanTransactionIds)
      .select();

    if (updateError) {
      console.error("Error updating overdue loans:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update overdue loans",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    console.log(`Updated ${updatedData?.length || 0} overdue loans`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedData?.length || 0} overdue loans`,
      updatedLoans: updatedData?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
