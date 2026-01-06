"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { supabaseClient } from "@/lib/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import {
  AddLoanDialogProps,
  BookCopy,
  LibraryCard,
} from "@/interfaces/addLoan";
import BookSearch from "./BookSearch";
import SelectedBooks from "./SelectedBooks";
import LoanForm from "./LoanForm";

const AddLoanDialog: React.FC<AddLoanDialogProps> = ({
  open,
  onOpenChange,
  onLoanCreated,
  initialCardId = null,
  initialBooks = null,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<LibraryCard[]>([]);
  const [availableBooks, setAvailableBooks] = useState<BookCopy[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<BookCopy[]>([]);
  const [borrowType, setBorrowType] = useState("Mượn về");

  const supabase = supabaseClient();

  const form = useForm({
    defaultValues: {
      card_id: "",
      borrow_type: "Mượn về",
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "borrow_type") {
        setBorrowType(value.borrow_type || "Mượn về");
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchLibraryCards();
        await fetchAvailableBooks();
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải dữ liệu. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      }
    };

    if (open) {
      fetchData();
      // If initial values are provided, prefill form and selected books
      if (initialCardId) {
        form.reset({ card_id: initialCardId.toString(), borrow_type: form.getValues("borrow_type") || "Mượn về" });
      }
      if (initialBooks && initialBooks.length > 0) {
        setSelectedBooks(initialBooks);
      }
    }
  }, [open]);

  const fetchLibraryCards = async () => {
    const { data: cardData, error: cardError } = await supabase
      .from("librarycard")
      .select(
        `
        card_id,
        card_number,
        card_status,
        current_deposit_balance,
        reader:reader_id (
          first_name,
          last_name
        )
      `,
      )
      .eq("card_status", "Hoạt động")
      .eq("card_type", "Thẻ mượn")
      .order("card_id", { ascending: true });

    if (cardError) {
      console.error("Card fetch error:", cardError);
      throw cardError;
    }

    const processedCards = cardData
      ? cardData.map((card) => ({
          ...card,
          reader: Array.isArray(card.reader)
            ? card.reader[0] || { first_name: "", last_name: "" }
            : card.reader || { first_name: "", last_name: "" },
        }))
      : [];

    setCards(processedCards);
  };

  const fetchAvailableBooks = async () => {
    const { data: bookData, error: bookError } = await supabase
      .from("bookcopy")
      .select(
        `
        copy_id,
        book_title_id,
        price,
        availability_status,
        condition_id,
        booktitle:book_title_id (
          title
        ),
        condition:condition_id (
          condition_name
        )
      `,
      )
      .eq("availability_status", "Có sẵn");

    if (bookError) {
      console.error("Book fetch error:", bookError);
      throw bookError;
    }

    const availableBookCopies = bookData
      ? bookData
          .map((book) => ({
            ...book,
            booktitle: Array.isArray(book.booktitle)
              ? book.booktitle[0] || { title: "Không có tiêu đề" }
              : book.booktitle || { title: "Không có tiêu đề" },
            condition: Array.isArray(book.condition)
              ? book.condition[0] || { condition_name: "Không xác định" }
              : book.condition || { condition_name: "Không xác định" },
          }))
          .filter((book) => book.condition.condition_name !== "Bị hư hại")
      : [];

    setAvailableBooks(availableBookCopies);
  };

  const handleAddBook = (book: BookCopy) => {
    setSelectedBooks([...selectedBooks, book]);
  };

  const handleRemoveBook = (copyId: number) => {
    setSelectedBooks(selectedBooks.filter((book) => book.copy_id !== copyId));
  };

  const onSubmit = async (values: any) => {
    if (!user?.staff_id) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin nhân viên.",
        variant: "destructive",
      });
      return;
    }

    if (selectedBooks.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một cuốn sách để mượn.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const bookCopyIds = selectedBooks.map((book) => book.copy_id);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/loan-transactions/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cardId: parseInt(values.card_id),
            staffId: user.staff_id,
            bookCopies: bookCopyIds,
            borrowType: values.borrow_type,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Lỗi không xác định khi tạo giao dịch mượn.",
        );
      }

      toast({
        title: "Thành công",
        description: "Đã tạo giao dịch mượn sách mới.",
      });

      if (onLoanCreated) {
        onLoanCreated();
      }

      form.reset();
      setSelectedBooks([]);
      setBorrowType("Mượn về");

      onOpenChange(false);

      router.refresh();
    } catch (error: any) {
      console.error("Error creating loan transaction:", error);
      toast({
        title: "Lỗi",
        description:
          error.message ||
          "Không thể tạo giao dịch mượn sách. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo giao dịch mượn sách mới</DialogTitle>
          <DialogDescription>
            Điền đầy đủ thông tin để tạo giao dịch mượn sách mới
          </DialogDescription>
        </DialogHeader>

        <LoanForm
          form={form}
          cards={cards}
          loading={loading}
          onOpenChange={onOpenChange}
          selectedBooks={selectedBooks}
          onSubmit={form.handleSubmit(onSubmit)}
          readOnlyCardId={initialCardId}
        >
          <div className="space-y-4">
            {!initialBooks && (
              <BookSearch
                availableBooks={availableBooks}
                selectedBooks={selectedBooks}
                onAddBook={handleAddBook}
              />
            )}

            <SelectedBooks
              selectedBooks={selectedBooks}
              onRemoveBook={handleRemoveBook}
              borrowType={borrowType}
              disableRemove={!!initialBooks}
            />
          </div>
        </LoanForm>
      </DialogContent>
    </Dialog>
  );
};

export default AddLoanDialog;
