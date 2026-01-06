"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, X } from "lucide-react";

interface StaffDetailModalProps {
  isOpen: boolean;
  staff: any;
  onClose: () => void;
  onEdit: (staff: any) => void;
  onDelete: (deletedId: string) => void;
  onSuccess?: () => void;
}

const StaffDetailModal = ({
  isOpen,
  staff,
  onClose,
  onEdit,
  onDelete,
  onSuccess,
}: StaffDetailModalProps) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isOpen || !staff) return null;

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/staff/delete`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId: staff.staff_id }),
        },
      );

      const result = await res.json();
      if (!res.ok) {
        toast({
          title: "Xóa thất bại",
          description: result.error || "Không thể xóa nhân viên.",
          variant: "destructive",
        });
        return;
      }

      onDelete(staff.staff_id);
      toast({ title: "Xóa nhân viên thành công", variant: "success" });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi hệ thống",
        description: "Không thể xóa nhân viên. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-md space-y-6 overflow-auto rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">
              Chi tiết nhân viên
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Thông tin cá nhân */}
            <Section title="Thông tin cá nhân">
              <InfoRow
                label="Họ và Tên"
                value={`${staff.last_name} ${staff.first_name}`}
              />
              <InfoRow label="Ngày sinh" value={staff.date_of_birth} />
              <InfoRow
                label="Giới tính"
                value={
                  staff.gender === "F"
                    ? "Nữ"
                    : staff.gender === "M"
                      ? "Nam"
                      : "Khác"
                }
              />
            </Section>

            {/* Liên hệ */}
            <Section title="Liên hệ">
              <InfoRow label="Email" value={staff.email} />
              <InfoRow label="Số điện thoại" value={staff.phone} />
              <InfoRow label="Địa chỉ" value={staff.address} />
            </Section>

            {/* Công việc */}
            <Section title="Công việc">
              <InfoRow
                label="Chức vụ"
                value={staff.role?.role_name || "Không rõ"}
              />
              <InfoRow label="Ngày làm việc" value={staff.hire_date} />
            </Section>
          </div>

          <DialogFooter className="flex flex-wrap justify-end gap-3 pt-4">
            <Button onClick={onClose} variant="ghost">
              Đóng
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
            >
              Xóa
            </Button>
            <Button onClick={() => onEdit(staff)}>Chỉnh sửa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm space-y-4 rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-destructive">
              Xác nhận xóa
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc chắn muốn xóa nhân viên{" "}
            <span className="font-semibold text-foreground">
              {staff.last_name} {staff.first_name}
            </span>{" "}
            không? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter className="flex justify-end gap-3">
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

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground">{value || "—"}</span>
  </div>
);

export default StaffDetailModal;
