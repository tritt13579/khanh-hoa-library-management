"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  uploadUrl: string;
  title?: string;
  description?: string;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  uploadUrl,
  title = "Tải lên file Excel",
  description = "Chọn một file Excel (.xlsx hoặc .xls) để tải dữ liệu lên hệ thống.",
}) => {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("Vui lòng chọn file Excel");

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const resultText = await response.text();
      let result: any;

      try {
        result = JSON.parse(resultText);
      } catch (err) {
        console.error("Không thể parse kết quả JSON:", resultText);
        return;
      }

      if (response.ok) {
        console.log(`${result.message}`);
        if (result.errors?.length > 0) {
          console.warn("Một số dòng lỗi:", result.errors);
        }
        onSuccess(result);
      } else {
        alert(result?.error || "Đã xảy ra lỗi.");
      }
    } catch (err) {
      console.error("Lỗi upload:", err);
    } finally {
      setIsUploading(false);
      onClose();
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="file-upload">Chọn file (.xlsx, .xls)</Label>
          <Input
            ref={fileRef}
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            disabled={isUploading}
          />
        </div>

        <DialogFooter className="pt-4 space-x-2">
          <Button variant="secondary" onClick={onClose} disabled={isUploading}>
            Hủy
          </Button>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Đang tải..." : "Tải lên"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;
