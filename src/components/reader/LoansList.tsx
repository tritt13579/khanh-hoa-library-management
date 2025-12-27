"use client";

import React, { useMemo, useState, useEffect } from "react";
import { subDays, startOfToday } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";

interface Props {
  loans: any[];
  authors: Record<string, string>;
}

export default function LoansList({ loans, authors }: Props) {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const defaultFrom = subDays(startOfToday(), 29);
  const defaultTo = startOfToday();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: defaultFrom, to: defaultTo });

  useEffect(() => {
    setIsSearching(true);
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    const s = debouncedSearch;
    const from = dateRange?.from ?? null;
    const to = dateRange?.to ?? null;

    return loans.filter((loan: any) => {
      if (status !== "all" && loan.loan_status !== status) return false;

      if (from || to) {
        const tx = loan.transaction_date ? new Date(loan.transaction_date) : null;
        if (tx) {
          if (from && tx < from) return false;
          if (to) {
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            if (tx > toEnd) return false;
          }
        }
      }

      if (!s) return true;
      // search in titles and authors
      const matchInBooks = (loan.loandetail || []).some((d: any) => {
        const title = d.bookcopy?.booktitle?.title || "";
        const bookId = d.bookcopy?.booktitle?.book_title_id;
        const author = bookId ? authors[String(bookId)] || "" : "";
        return (
          title.toLowerCase().includes(s) || author.toLowerCase().includes(s)
        );
      });

      return matchInBooks;
    });
  }, [loans, authors, status, debouncedSearch, dateRange]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 items-center">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path></svg>
          </div>
          <input
            placeholder="Tìm theo tiêu đề hoặc tác giả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-10 pr-10 rounded-lg h-9 bg-muted/30 dark:bg-slate-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 border border-gray-200 dark:border-slate-700 shadow-sm"
            aria-label="Tìm theo tiêu đề hoặc tác giả"
          />

          {isSearching && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
            </div>
          )}

          {search && !isSearching && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted/20"
              aria-label="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="select w-full rounded-lg h-9 bg-muted/30 dark:bg-slate-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 border border-gray-200 dark:border-slate-700 shadow-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Đang mượn">Đang mượn</option>
          <option value="Đã trả">Đã trả</option>
          <option value="Quá hạn">Quá hạn</option>
        </select>

        <div className="w-full">
          <DatePickerWithRange
            value={dateRange ? { from: dateRange.from as Date, to: dateRange.to as Date } : { from: new Date(), to: undefined }}
            onChange={(r) => setDateRange(r)}
            buttonClassName="w-full rounded-lg h-9 bg-muted/30 dark:bg-slate-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 border border-gray-200 dark:border-slate-700 shadow-sm text-left"
          />
        </div>
      </div>

      <div className="space-y-6">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">Không tìm thấy kết quả phù hợp.</p>
        ) : (
          filtered.map((loan: any) => (
            <div key={loan.loan_transaction_id} className="rounded-lg border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-lg font-semibold">{loan.borrow_type || "Mượn"}</div>
                      <div className="text-sm text-muted-foreground">Ngày: {loan.transaction_date || "-"} • Hạn trả: {loan.due_date || "-"}</div>
                    </div>
                    <div className="ml-4 rounded-full bg-muted px-3 py-1 text-sm">{loan.loan_status}</div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="text-sm">
                      <div className="text-muted-foreground">Số sách</div>
                      <div className="font-medium">{(loan.loandetail || []).length}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">Trạng thái giao dịch</div>
                      <div className="font-medium">{loan.loan_status}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="font-medium">Danh sách sách</div>
                <div className="mt-2 grid grid-cols-1 gap-3">
                  {(loan.loandetail || []).map((d: any) => {
                    const book = d.bookcopy || {};
                    const title = book.booktitle?.title || "Tiêu đề không rõ";
                    const bookTitleId = book.booktitle?.book_title_id;
                    const authorsText = bookTitleId ? authors[String(bookTitleId)] || "Không rõ tác giả" : "Không rõ tác giả";
                    return (
                      <div key={d.loan_detail_id} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <div className="font-medium">{title}</div>
                          <div className="text-xs text-muted-foreground">{authorsText} • {book.condition?.condition_name || "Tình trạng không rõ"}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div>Gia hạn: {d.renewal_count ?? 0}</div>
                          <div>Trả: {d.return_date ? d.return_date : "Chưa trả"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
