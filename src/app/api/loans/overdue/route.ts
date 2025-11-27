import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
  try {
    // Lấy danh sách loans quá hạn (chỉ những sách chưa trả)
    const { data, error } = await supabase
      .from("loantransaction")
      .select(
        `
        loan_transaction_id,
        due_date,
        loan_status,
        transaction_date,
        librarycard!inner(
          reader!inner(
            first_name,
            last_name,
            email
          )
        ),
        loandetail!inner(
          loan_detail_id,
          return_date,
          copy_id
        )
      `,
      )
      .lt("due_date", new Date().toISOString().split("T")[0])
      .in("loan_status", ["Đang mượn", "Quá hạn"])
      .is("loandetail.return_date", null); // Chỉ lấy sách chưa trả

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Tính toán thêm số ngày quá hạn cho mỗi loan
    const overdueLoansWithDays = data?.map((loan) => {
      const dueDate = new Date(loan.due_date);
      const today = new Date();
      const overdueDays = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        ...loan,
        overdue_days: overdueDays > 0 ? overdueDays : 0,
      };
    });

    return NextResponse.json({
      success: true,
      overdueLoans: overdueLoansWithDays,
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
