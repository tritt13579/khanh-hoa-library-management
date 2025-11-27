"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Loader2 } from "lucide-react";
import LoanManagementTab from "@/components/transaction/loan/LoanManagementTab";
import ReservationsTab from "@/components/ReservationsTab";
import { supabaseClient } from "@/lib/client";
import {
  FormattedLoanTransaction,
  FormattedReservation,
  LoanTransactionData,
  ReservationData,
} from "@/interfaces/library";

const StaffHomePage = () => {
  const [loanTransactions, setLoanTransactions] = useState<
    FormattedLoanTransaction[]
  >([]);
  const [reservations, setReservations] = useState<FormattedReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoanTransactions = async () => {
    try {
      setLoading(true);
      const supabase = supabaseClient();

      const { data: bookAuthorsData, error: bookAuthorsError } =
        await supabase.from("iswrittenby").select(`
            book_title_id,
            author_id,
            author:author_id (
              author_id,
              author_name
            )
          `);

      if (bookAuthorsError) throw bookAuthorsError;

      const bookAuthorsMap = new Map<number, string>();
      bookAuthorsData?.forEach((item: any) => {
        const bookId = item.book_title_id;
        const authorObj = Array.isArray(item.author)
          ? item.author[0]
          : item.author;
        const authorName = authorObj?.author_name || "Unknown";

        if (bookAuthorsMap.has(bookId)) {
          bookAuthorsMap.set(
            bookId,
            `${bookAuthorsMap.get(bookId)}, ${authorName}`,
          );
        } else {
          bookAuthorsMap.set(bookId, authorName);
        }
      });

      const { data: loanData, error: loanError } = await supabase
        .from("loantransaction")
        .select(
          `
            loan_transaction_id,
            transaction_date,
            due_date,
            loan_status,
            borrow_type,
            staff:staff_id (
              staff_id,
              first_name,
              last_name
            ),
            librarycard:card_id (
              card_id,
              card_number,
              reader:reader_id (
                reader_id,
                first_name,
                last_name,
                email
              )
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
        .order("loan_transaction_id", { ascending: false });

      if (loanError) throw loanError;

      const { data: reservationData, error: reservationError } = await supabase
        .from("reservation")
        .select(
          `
              reservation_id,
              reservation_date,
              expiration_date,
              reservation_status,
              booktitle:book_title_id (
                title,
                book_title_id
              ),
              librarycard:card_id (
                card_id,
                card_number,
                reader:reader_id (
                  reader_id,
                  first_name,
                  last_name,
                  email
                )
              )
            `,
        )
        .order("reservation_date", { ascending: false });

      if (reservationError) throw reservationError;

      const formattedLoanTransactions =
        loanData?.map((loan: any) => {
          const books =
            loan?.loandetail?.map((detail: any) => {
              const bookTitleId = detail.bookcopy?.booktitle?.book_title_id;
              return {
                id: detail.bookcopy?.copy_id,
                title: detail.bookcopy?.booktitle?.title || "Không rõ tiêu đề",
                author: bookAuthorsMap.get(bookTitleId!) || "Không rõ tác giả",
                condition:
                  detail.bookcopy?.condition?.condition_name ||
                  "Không rõ tình trạng",
                returnDate: detail.return_date,
              };
            }) || [];

          const reader = Array.isArray(loan?.librarycard?.reader)
            ? loan?.librarycard?.reader[0]
            : loan?.librarycard?.reader;

          const staff = Array.isArray(loan?.staff)
            ? loan?.staff[0]
            : loan?.staff;

          return {
            id: loan.loan_transaction_id,
            reader: {
              id: reader?.reader_id,
              cardNumber: loan?.librarycard?.card_number || "Unknown",
              name:
                `${reader?.last_name || ""} ${reader?.first_name || ""}`.trim() ||
                "Unknown",
              email: reader?.email || "",
            },
            transactionDate: loan.transaction_date,
            dueDate: loan.due_date,
            status: loan.loan_status,
            borrowType: loan.borrow_type || "Unknown",
            books: books,
            staffName:
              `${staff?.last_name || ""} ${staff?.first_name || ""}`.trim() ||
              "Unknown",
          };
        }) || [];

      const formattedReservations =
        reservationData?.map((reservation: any) => {
          const reader = Array.isArray(reservation?.librarycard?.reader)
            ? reservation?.librarycard?.reader[0]
            : reservation?.librarycard?.reader;

          const bookTitle = Array.isArray(reservation?.booktitle)
            ? reservation?.booktitle[0]
            : reservation?.booktitle;

          const bookTitleId = bookTitle?.book_title_id;

          return {
            id: reservation.reservation_id,
            reader: {
              id: reader?.reader_id,
              cardNumber: reservation?.librarycard?.card_number || "Unknown",
              name:
                `${reader?.last_name || ""} ${reader?.first_name || ""}`.trim() ||
                "Unknown",
              email: reader?.email || "",
            },
            bookTitle: bookTitle?.title || "Unknown Title",
            author: bookAuthorsMap.get(bookTitleId!) || "Unknown Author",
            reservationDate: reservation.reservation_date,
            expirationDate: reservation.expiration_date,
            status: reservation.reservation_status,
          };
        }) || [];

      setLoanTransactions(formattedLoanTransactions);
      setReservations(formattedReservations);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanTransactions();
  }, []);

  const handleLoanCreated = () => {
    fetchLoanTransactions();
  };

  const handleLoanStatusChanged = () => {
    fetchLoanTransactions();
  };

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <p className="font-semibold text-red-500">
          Lỗi khi tải dữ liệu: {error}
        </p>
        <button
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Quản lý Mượn/Trả Sách</h1>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2">Đang tải dữ liệu...</span>
        </div>
      ) : (
        <Tabs defaultValue="loan-management" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="loan-management" className="px-6">
              <BookOpen className="mr-2 h-4 w-4" />
              Quản lý Mượn/Trả
            </TabsTrigger>
            <TabsTrigger value="reservations" className="px-6">
              <Clock className="mr-2 h-4 w-4" />
              Đặt trước sách
            </TabsTrigger>
          </TabsList>

          {/* Tab Quản lý mượn/trả */}
          <TabsContent value="loan-management">
            <LoanManagementTab
              loanTransactions={loanTransactions}
              onLoanCreated={handleLoanCreated}
              onLoanStatusChanged={handleLoanStatusChanged}
            />
          </TabsContent>

          {/* Tab Đặt trước sách */}
          <TabsContent value="reservations">
            <ReservationsTab reservations={reservations} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default StaffHomePage;
