"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface ConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  copyId: number;
  currentConditionId?: string;
  conditions: { id: string; name: string }[];
  onSuccess?: (updatedCondition?: {
    condition_id: number;
    condition_name: string;
  }) => void;
}

const ConditionModal: React.FC<ConditionModalProps> = ({
  isOpen,
  onClose,
  copyId,
  currentConditionId,
  conditions,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [selectedCondition, setSelectedCondition] = useState(
    currentConditionId || "",
  );
  const [loading, setLoading] = useState(false);

  // Đặt giá trị mặc định cho selectedCondition khi modal mở
  useEffect(() => {
    if (isOpen && currentConditionId) {
      setSelectedCondition(currentConditionId);
    }
  }, [isOpen, currentConditionId]);

  // Tìm condition hiện tại
  const currentCondition = conditions.find(
    (cond) => cond.id === currentConditionId,
  );

  // Lọc ra các condition có id lớn hơn hoặc bằng condition hiện tại
  // Vì id tăng dần nhưng trạng thái giảm dần (1: Còn mới, 2: Đã cũ, 3: Bị hư hại)
  const availableConditions = conditions.filter((cond) => {
    // Nếu chưa có currentConditionId, hiển thị tất cả các lựa chọn
    if (!currentConditionId) return true;

    // Nếu đã có currentConditionId, chỉ hiển thị các condition có id >= currentConditionId
    return parseInt(cond.id) >= parseInt(currentConditionId);
  });

  const handleSave = async () => {
    if (!selectedCondition || !copyId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/book/editcopy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          copy_id: copyId,
          new_condition_id: selectedCondition,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Lỗi cập nhật:", result.error);
        toast({
          title: "Lỗi cập nhật tình trạng",
          description:
            result.error || "Không thể cập nhật tình trạng. Vui lòng thử lại.",
          variant: "destructive",
        });
      } else {
        const updatedCond = conditions.find((c) => c.id === selectedCondition);
        toast({
          title: "Cập nhật thành công",
          description: `Đã chuyển sang "${updatedCond?.name}"`,
          variant: "success",
        });
        onSuccess?.({
          condition_id: Number(updatedCond?.id),
          condition_name: updatedCond?.name || "",
        });
        onClose();
      }
    } catch (err) {
      console.error("Lỗi khi gọi API:", err);
      toast({
        title: "Lỗi hệ thống",
        description: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Tìm tên của condition hiện tại để hiển thị
  const currentConditionName = currentCondition
    ? currentCondition.name
    : "Chọn tình trạng";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật tình trạng bản sao</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Select
            value={selectedCondition}
            onValueChange={setSelectedCondition}
          >
            <SelectTrigger>
              <SelectValue placeholder={currentConditionName} />
            </SelectTrigger>
            <SelectContent>
              {availableConditions.map((cond) => (
                <SelectItem key={cond.id} value={cond.id}>
                  {cond.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConditionModal;
