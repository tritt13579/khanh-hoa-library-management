"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CreditCardIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ReaderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCard: () => void;
  reader: any;
  onDeleted?: () => void;
  onSuccess?: () => void;
}

const ReaderDetailModal: React.FC<ReaderDetailModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  onCard,
  reader,
  onDeleted,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!reader) return null;

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/reader/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reader_id: reader.reader_id }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: data.error || "Xóa độc giả thất bại",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Xóa độc giả thành công", variant: "success" });
      onSuccess?.();
      onClose();
      onDeleted?.();
    } catch (error: any) {
      toast({
        title: "Lỗi kết nối hoặc lỗi không xác định",
        variant: "destructive",
      });
      console.error("Lỗi khi xóa:", error);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-full max-w-md sm:max-w-xl md:max-h-[90vh] lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-primary">
              {reader.last_name} {reader.first_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left: Info */}
            <div className="flex h-full flex-col space-y-3 text-base text-muted-foreground lg:w-full">
              <p className="text-sm text-gray-400">ID: {reader.reader_id}</p>

              <Info label="Ngày sinh" value={reader.date_of_birth} />
              <Info
                label="Giới tính"
                value={reader.gender === "M" ? "Nam" : "Nữ"}
              />
              <Info label="Email" value={reader.email} />
              <Info label="Số điện thoại" value={reader.phone} />
              <Info label="Địa chỉ" value={reader.address} />

              <div className="mt-auto flex flex-wrap gap-3">
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
                <Button onClick={onCard} className="gap-2">
                  <CreditCardIcon className="h-4 w-4" />
                  Thẻ
                </Button>
                <Button onClick={onEdit} className="gap-2">
                  <PencilSquareIcon className="h-4 w-4" />
                  Sửa
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  variant="destructive"
                  className="gap-2"
                  disabled={isDeleting}
                >
                  <TrashIcon className="h-4 w-4" />
                  {isDeleting ? "Đang xóa..." : "Xóa"}
                </Button>
              </div>
            </div>

            {/* Right: Avatar */}
            <div className="hidden lg:block lg:w-2/3">
              <div className="aspect-square overflow-hidden rounded-xl border border-gray-200 shadow-lg">
                <Image
                  src={reader.photo_url || "/images/logo/avatar.jpg"}
                  alt="Ảnh độc giả"
                  width={400}
                  height={400}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm space-y-4 rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg text-destructive">
              Xác nhận xóa
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc chắn muốn xóa độc giả{" "}
            <span className="font-semibold text-foreground">
              {reader.last_name} {reader.first_name}
            </span>{" "}
            không? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmed}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <p>
    <span className="font-medium text-primary">{label}:</span>{" "}
    <span className="text-foreground">{value}</span>
  </p>
);

export default ReaderDetailModal;
