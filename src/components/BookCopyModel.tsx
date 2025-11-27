"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const BookCopyModal = ({
  isOpen,
  onClose,
  bookTitle,
  bookTitleId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: { title: string };
  bookTitleId: string;
  onSuccess: () => void;
}) => {
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [price, setPrice] = useState("");
  const [conditionId, setConditionId] = useState("1");

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append(
      "bookCopyData",
      JSON.stringify({
        book_title_id: bookTitleId,
        acquisition_date: acquisitionDate,
        price: parseFloat(price),
        condition_id: parseInt(conditionId),
      }),
    );

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/book/addcopy`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: "Lỗi",
          description: result.error || "Lỗi khi thêm bản sao",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Thành công",
        description: "Thêm bản sao thành công",
        variant: "success",
      });
      onSuccess();
      onClose();
      setAcquisitionDate("");
      setPrice("");
      setConditionId("1");
    } catch (error) {
      console.error("Lỗi khi gửi yêu cầu:", error);
      toast({
        title: "Lỗi",
        description: "Lỗi hệ thống. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle>Thêm bản sao mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Tiêu đề sách
            </label>
            <input
              type="text"
              value={bookTitle.title}
              readOnly
              className="mt-1 w-full rounded-md border bg-primary-foreground px-3 py-2 text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Ngày nhập</label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="mt-1 w-full rounded-md border bg-primary-foreground px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Giá mua (VNĐ)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-md border bg-primary-foreground px-3 py-2"
            />
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookCopyModal;
