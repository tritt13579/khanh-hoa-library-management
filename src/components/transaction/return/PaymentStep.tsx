"use client";

import React, { useRef, useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabaseClient } from "@/lib/client";
import { numberToVietnameseWords } from "@/lib/numbertpwords";
import { BookReturnStatus } from "@/interfaces/ReturnBook";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PaymentStepProps {
  totalFine: number;
  fullName?: string;
  booksStatus?: BookReturnStatus[];
}

interface InvoiceItem {
  title: string;
  fine: number;
  feeType: string;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  totalFine,
  fullName,
  booksStatus = [],
}) => {
  const [open, setOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [creatorName, setCreatorName] = useState<string>("");
  const displayName = fullName?.trim() || "Chưa có tên";

  const getInvoiceItems = (): InvoiceItem[] => {
    const items: InvoiceItem[] = [];

    const selectedBooks = booksStatus.filter((status) => status.isSelected);

    selectedBooks.forEach((status) => {
      if (status.lateFee > 0) {
        items.push({
          title: status.book.title,
          fine: status.lateFee,
          feeType: "Phí trả trễ",
        });
      }

      if (status.damageFee > 0) {
        const feeType =
          status.availabilityStatus === "Thất lạc"
            ? "Phí thất lạc"
            : "Phí hư hại";
        items.push({
          title: status.book.title,
          fine: status.damageFee,
          feeType: feeType,
        });
      }

      if (status.lateFee === 0 && status.damageFee === 0) {
        items.push({
          title: status.book.title,
          fine: 0,
          feeType: "Không có phí",
        });
      }
    });

    console.log("Invoice Items:", items);

    return items;
  };

  useEffect(() => {
    if (!open) return;

    const fetchEmployeeName = async () => {
      const supabase = supabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("staff")
        .select("first_name, last_name")
        .eq("auth_user_id", user.id)
        .single();

      if (!error && data) {
        setCreatorName(`${data.last_name} ${data.first_name}`);
      }
    };

    fetchEmployeeName();
  }, [open]);

  const handleExportPDF = async () => {
    if (!invoiceRef.current) return;

    const isDarkMode =
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const colors = {
      light: {
        background: "#ffffff",
        foreground: "#000000",
        border: "#d1d5db",
        tableBg: "#f9fafb",
        muted: "#6b7280",
        destructive: "#dc2626",
      },
      dark: {
        background: "#0f172a", // slate-900
        foreground: "#f8fafc", // slate-50
        border: "#374151", // gray-700
        tableBg: "#1e293b", // slate-800
        muted: "#94a3b8", // slate-400
        destructive: "#ef4444", // red-500
      },
    };

    const theme = isDarkMode ? colors.dark : colors.light;

    const clonedElement = invoiceRef.current.cloneNode(true) as HTMLElement;

    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    tempContainer.style.width = invoiceRef.current.offsetWidth + "px";
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    const applyInlineStyles = (element: HTMLElement) => {
      const computedStyle = window.getComputedStyle(element);

      element.style.backgroundColor =
        computedStyle.backgroundColor === "rgba(0, 0, 0, 0)" ||
        computedStyle.backgroundColor === "transparent"
          ? "transparent"
          : computedStyle.backgroundColor || theme.background;
      element.style.color = computedStyle.color || theme.foreground;
      element.style.borderColor = computedStyle.borderColor || theme.border;

      if (
        element.classList.contains("text-gray-500") ||
        element.style.color === "rgb(107, 114, 128)"
      ) {
        element.style.color = theme.muted;
      }

      // Recursively apply to children
      Array.from(element.children).forEach((child) => {
        if (child instanceof HTMLElement) {
          applyInlineStyles(child);
        }
      });
    };

    applyInlineStyles(clonedElement);

    try {
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: theme.background,
        // Ignore elements that might cause issues
        ignoreElements: (element) => {
          return element.tagName === "STYLE" || element.tagName === "SCRIPT";
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [110, 140],
      });

      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 10, width, height);
      pdf.save("hoa-don-tra-sach.pdf");
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  };

  const invoiceItems = getInvoiceItems();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Xác nhận thanh toán</CardTitle>
          <CardDescription>
            {totalFine > 0
              ? "Thanh toán sẽ được ghi nhận bằng tiền mặt"
              : "Không có khoản phí phát sinh"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalFine > 0 ? (
            <div className="space-y-4">
              <div className="text-xl font-bold">
                Tổng tiền cần thanh toán: {totalFine.toLocaleString("vi-VN")}{" "}
                VNĐ
              </div>

              {/* Nút xem hóa đơn */}
              <div className="pt-4">
                <Dialog
                  open={open}
                  onOpenChange={(isOpen) => {
                    setOpen(isOpen);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="default" onClick={() => setOpen(true)}>
                      Xem hóa đơn
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-center text-xl"></DialogTitle>
                    </DialogHeader>

                    <div
                      ref={invoiceRef}
                      className="space-y-4 rounded bg-background p-4 font-sans text-sm text-foreground shadow-sm"
                    >
                      <div className="text-center">
                        <h2 className="text-base font-bold uppercase">
                          Thư Viện Tỉnh Khánh Hòa
                        </h2>
                        <p>Số 8 Trần Hưng Đạo, TP Nha Trang</p>
                        <p>ĐT: 84.258.3525189 | tvt.svhtt@khanhhoa.gov.vn</p>
                      </div>

                      <div className="my-2 text-center text-base font-semibold">
                        HÓA ĐƠN THANH TOÁN PHÍ TRẢ SÁCH
                      </div>

                      <p>
                        <strong>Họ tên:</strong> {displayName}
                      </p>
                      <p>
                        <strong>Ngày:</strong>{" "}
                        {new Date().toLocaleDateString("vi-VN")}
                      </p>

                      <Separator />

                      {/* Table of items */}
                      <table className="w-full border border-border text-left text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="border border-border px-2 py-1">
                              Sách
                            </th>
                            <th className="border border-border px-2 py-1 text-right">
                              Phí phạt
                            </th>
                            <th className="border border-border px-2 py-1">
                              Loại phí
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.length > 0 ? (
                            invoiceItems.map((item, index) => (
                              <tr key={index}>
                                <td className="border border-border px-2 py-1">
                                  {item.title || "Không có tên sách"}
                                </td>
                                <td className="border border-border px-2 py-1 text-right">
                                  {item.fine.toLocaleString("vi-VN")}₫
                                </td>
                                <td className="border border-border px-2 py-1">
                                  {item.feeType}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={3}
                                className="border border-border px-2 py-1 text-center text-muted-foreground"
                              >
                                Không có dữ liệu sách
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/50 font-medium text-destructive">
                            <td className="border border-border px-2 py-1">
                              Tổng cộng
                            </td>
                            <td className="border border-border px-2 py-1 text-right">
                              {totalFine.toLocaleString("vi-VN")}₫
                            </td>
                            <td className="border border-border px-2 py-1"></td>
                          </tr>
                        </tfoot>
                      </table>

                      <p className="mt-1 text-sm italic text-muted-foreground">
                        (Bằng chữ: {numberToVietnameseWords(totalFine)})
                      </p>

                      <div className="mt-6 flex justify-between text-xs">
                        <div className="w-1/2 text-center">
                          <p>Người lập</p>
                          <p className="italic">(Ký tên)</p>
                          <p>{creatorName}</p>
                        </div>
                        <div className="w-1/2 text-center">
                          <p>Khách hàng</p>
                          <p className="italic">(Ký tên)</p>
                          <p>{fullName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-6">
                      <Button variant="outline" onClick={() => setOpen(false)}>
                        Đóng
                      </Button>
                      <Button onClick={handleExportPDF}>
                        In hóa đơn
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
              <p className="text-xl">Không có khoản phí phát sinh</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
