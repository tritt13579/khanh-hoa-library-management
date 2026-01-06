"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Book {
  id: string;
  title: string;
  dueAt: string;
  price: number;
  loan_transaction_id: number;
  loan_detail_id: number;
}

interface BorrowerInfo {
  borrower: string;
  birthdate: string;
  address: string;
  phone: string;
}

interface Props {
  borrowerInfo: BorrowerInfo;
  books: Book[];
  today: Date;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  numberToVietnameseWords: (n: number) => string;
}

const getPenaltyValue = async () => {
  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("systemsetting")
    .select("setting_value")
    .eq("setting_id", 2)
    .single();

  if (error || !data) {
    console.error("Lỗi khi lấy giá trị phạt:", error);
    return null;
  }

  return parseInt(data.setting_value, 10);
};

const updateLoanStatus = async (loan_transaction_id: number) => {
  const res = await fetch(
    `/api/reader/confirmloan`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan_transaction_id }),
    },
  );

  if (!res.ok) {
    console.error("Lỗi khi cập nhật trạng thái mượn:", await res.json());
  }
};

const deleteLoanDetail = async (loan_detail_id: number) => {
  const res = await fetch(
    `/api/reader/deleteloandetail`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan_detail_id }),
    },
  );

  if (!res.ok) {
    console.error("Lỗi khi xóa loan_detail:", await res.json());
    return false;
  }

  return true;
};

export default function NoticeModal({
  borrowerInfo,
  books,
  today,
  open,
  onClose,
  numberToVietnameseWords,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [penaltyRate, setPenaltyRate] = useState<number | null>(null);
  const [bookList, setBookList] = useState<Book[]>(books);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setBookList(books); // Reset lại khi mở modal
      getPenaltyValue().then((value) => {
        if (value !== null) setPenaltyRate(value);
      });
    }
  }, [open, books]);

  const handleMarkAllReturned = async () => {
    setIsSaving(true);
    const uniqueTransactionIds = Array.from(
      new Set(bookList.map((book) => book.loan_transaction_id)),
    );

    await Promise.all(uniqueTransactionIds.map(updateLoanStatus));
    toast({ title: "Cập nhật thành công", variant: "success" });
    onSuccess?.();
    onClose();
    setIsSaving(false);
  };

  const handleDelete = async (loan_detail_id: number) => {
    setIsDeleting(loan_detail_id);
    const success = await deleteLoanDetail(loan_detail_id);
    if (success) {
      const newBooks = bookList.filter(
        (b) => b.loan_detail_id !== loan_detail_id,
      );
      setBookList(newBooks);
      toast({ title: "Cập nhật thành công", variant: "success" });
      onSuccess?.();
      onClose();
      setIsDeleting(null);
    }
  };

  if (!open || penaltyRate === null) return null;

  const penaltyBooks = bookList.map((b) => {
    const dueDate = new Date(b.dueAt);
    const diffDays = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const overdueDays = Math.max(diffDays, 0);
    const daysToCharge = Math.max(overdueDays - 2, 0);
    const penalty = daysToCharge * penaltyRate;
    return { ...b, overdueDays, penalty };
  });

  const totalPenalty = penaltyBooks.reduce((sum, b) => sum + b.penalty, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            THÔNG BÁO SÁCH QUÁ HẠN
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p>
            Ngày {today.getDate()} tháng {today.getMonth() + 1} năm{" "}
            {today.getFullYear()}
          </p>
          <p>
            <strong>Họ tên:</strong> {borrowerInfo.borrower}
          </p>
          <p>
            <strong>Ngày sinh:</strong> {borrowerInfo.birthdate}
          </p>
          <p>
            <strong>Địa chỉ:</strong> {borrowerInfo.address}
          </p>
          <p>
            <strong>Điện thoại:</strong> {borrowerInfo.phone}
          </p>

          <p className="mt-4 font-semibold">Danh sách mượn:</p>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse border text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="border px-2 py-1">STT</th>
                  <th className="border px-2 py-1">Mã sách</th>
                  <th className="border px-2 py-1">Tên sách</th>
                  <th className="border px-2 py-1">Số ngày quá hạn</th>
                  <th className="border px-2 py-1">Tiền phạt</th>
                  <th className="border px-2 py-1">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {penaltyBooks.map((book, idx) => (
                  <tr key={book.id}>
                    <td className="border px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border px-2 py-1 text-center">{book.id}</td>
                    <td className="border px-2 py-1">{book.title}</td>
                    <td className="border px-2 py-1 text-center">
                      {book.overdueDays}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {book.penalty.toLocaleString()}đ
                    </td>
                    <td className="space-x-2 border px-2 py-1 text-center">
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(book.loan_detail_id)}
                        disabled={isDeleting === book.loan_detail_id}
                      >
                        {isDeleting === book.loan_detail_id
                          ? "Đang xóa..."
                          : "Xóa"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2">
            Tổng tiền phạt: <strong>{totalPenalty.toLocaleString()}đ</strong> (
            <em>{numberToVietnameseWords(Math.round(totalPenalty))} đồng</em>)
          </p>
        </div>

        <DialogFooter className="mt-4 space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={() => alert("Đã gửi thông báo!")}>
            Gửi thông báo
          </Button>
          <Button
            variant="outline"
            onClick={handleMarkAllReturned}
            disabled={isSaving}
          >
            {isSaving ? "Đang lưu..." : "Đã trả"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
