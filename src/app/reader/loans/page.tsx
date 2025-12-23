import { getUser, createClient } from "@/auth/server";
import NoFooterLayout from "@/components/layout/NoFooterLayout";

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default async function LoansPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Vui lòng đăng nhập để xem lịch sử mượn.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: readerData } = await supabase
    .from("reader")
    .select("reader_id, first_name, last_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!readerData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Không tìm thấy thông tin độc giả.</p>
      </div>
    );
  }

  // Fetch authors mapping
  const { data: bookAuthorsData, error: bookAuthorsError } = await supabase
    .from("iswrittenby")
    .select(
      `
        book_title_id,
        author:author_id (
          author_id,
          author_name
        )
      `,
    );

  const bookAuthorsMap = new Map<number, string>();
  if (!bookAuthorsError && Array.isArray(bookAuthorsData)) {
    bookAuthorsData.forEach((item: any) => {
      const bookId = item.book_title_id;
      const authorObj = Array.isArray(item.author) ? item.author[0] : item.author;
      const authorName = authorObj?.author_name || "Unknown";
      if (bookAuthorsMap.has(bookId)) {
        bookAuthorsMap.set(bookId, `${bookAuthorsMap.get(bookId)}, ${authorName}`);
      } else {
        bookAuthorsMap.set(bookId, authorName);
      }
    });
  }

  const { data: cards } = await supabase
    .from("librarycard")
    .select("card_id")
    .eq("reader_id", readerData.reader_id);

  const cardIds = (cards || []).map((c: any) => c.card_id);

  let loans: any[] = [];
  if (cardIds.length > 0) {
    const { data: loanData } = await supabase
      .from("loantransaction")
      .select(
        `
          loan_transaction_id,
          transaction_date,
          due_date,
          loan_status,
          borrow_type,
          librarycard:card_id (
            card_id,
            card_number
          ),
          loandetail!loan_transaction_id (
            loan_detail_id,
            return_date,
            renewal_count,
            bookcopy:copy_id (
              copy_id,
              booktitle:book_title_id (
                title,
                book_title_id
              ),
              condition:condition_id (
                condition_name
              )
            )
          )
        `,
      )
      .in("card_id", cardIds)
      .order("loan_transaction_id", { ascending: false });

    loans = loanData || [];
  }

  // convert authors map to plain object for client component
  const authorsObj: Record<string, string> = {};
  for (const [k, v] of (Array.from((bookAuthorsMap || new Map()) as Map<number, string>) as any)) {
    authorsObj[String(k)] = v as string;
  }

  return (
    <NoFooterLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Lịch sử mượn của bạn</h1>

        {loans.length === 0 ? (
          <p className="text-muted-foreground">Bạn chưa có giao dịch mượn nào.</p>
        ) : (
          // Lazy-load client filtering list
          <div>
            {/* @ts-ignore */}
            <LoansList loans={loans} authors={authorsObj} />
          </div>
        )}
      </div>
    </NoFooterLayout>
  );
}

import LoansList from "@/components/reader/LoansList";
