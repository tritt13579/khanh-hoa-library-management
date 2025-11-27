"use client";

import { useRef, useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/client";
import { numberToVietnameseWords } from "@/lib/numbertpwords";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface PaymentCardModelProps {
  cardFee: number;
  depositFee: number;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  oldDepositAmount?: number;
  isEdit?: boolean;
  fullName?: string;
}

export default function PaymentCardModel({
  cardFee,
  depositFee,
  paymentMethod,
  setPaymentMethod,
  oldDepositAmount = 0,
  isEdit = false,
  fullName,
}: PaymentCardModelProps) {
  const [open, setOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [creatorName, setCreatorName] = useState<string>("");
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");

  const diffDeposit = depositFee - oldDepositAmount;
  const total = isEdit ? diffDeposit : cardFee + depositFee;

  // Detect theme changes
  useEffect(() => {
    const detectTheme = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setCurrentTheme(isDark ? "dark" : "light");
    };

    detectTheme();

    // Listen for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", detectTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", detectTheme);
    };
  }, []);

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

    // Detect current theme
    const isDarkMode =
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Define color schemes
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

    // Clone the element to avoid modifying the original
    const clonedElement = invoiceRef.current.cloneNode(true) as HTMLElement;

    // Create a temporary container with inline styles that html2canvas can understand
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    tempContainer.style.width = invoiceRef.current.offsetWidth + "px";
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Apply inline styles to replace CSS custom properties
    const applyInlineStyles = (element: HTMLElement) => {
      // Get computed styles
      const computedStyle = window.getComputedStyle(element);

      // Apply key styles that might use CSS custom properties
      element.style.backgroundColor =
        computedStyle.backgroundColor === "rgba(0, 0, 0, 0)" ||
        computedStyle.backgroundColor === "transparent"
          ? "transparent"
          : computedStyle.backgroundColor || theme.background;
      element.style.color = computedStyle.color || theme.foreground;
      element.style.borderColor = computedStyle.borderColor || theme.border;

      // Handle specific classes
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
      pdf.save("hoa-don.pdf");
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setPaymentMethod("");
        }
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
            HÓA ĐƠN THANH TOÁN
          </div>

          <p>
            <strong>Ngày:</strong> {new Date().toLocaleDateString("vi-VN")}
          </p>

          <Separator />

          {/* Table of items */}
          <table className="w-full border border-border text-left text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-2 py-1">Mục</th>
                <th className="border border-border px-2 py-1 text-right">
                  Thành tiền
                </th>
                <th className="border border-border px-2 py-1">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-2 py-1">
                  Chi phí tạo thẻ
                </td>
                <td className="border border-border px-2 py-1 text-right">
                  {isEdit ? (
                    <span className="text-muted-foreground line-through">
                      {cardFee.toLocaleString("vi-VN")}₫
                    </span>
                  ) : (
                    cardFee.toLocaleString("vi-VN") + "₫"
                  )}
                </td>
                <td className="border border-border px-2 py-1">
                  Phí khởi tạo thẻ thư viện
                </td>
              </tr>
              <tr>
                <td className="border border-border px-2 py-1">
                  Chi phí hạn mức
                </td>
                <td className="border border-border px-2 py-1 text-right">
                  {isEdit
                    ? diffDeposit >= 0
                      ? diffDeposit.toLocaleString("vi-VN") + "₫"
                      : `- ${Math.abs(diffDeposit).toLocaleString("vi-VN")}₫`
                    : depositFee.toLocaleString("vi-VN") + "₫"}
                </td>
                <td className="border border-border px-2 py-1">
                  {isEdit
                    ? diffDeposit >= 0
                      ? "Tăng hạn mức"
                      : "Hoàn tiền"
                    : "Đặt cọc sử dụng dịch vụ"}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-medium text-destructive">
                <td className="border border-border px-2 py-1">Tổng cộng</td>
                <td className="border border-border px-2 py-1 text-right">
                  {total >= 0
                    ? total.toLocaleString("vi-VN") + "₫"
                    : `- ${Math.abs(total).toLocaleString("vi-VN")}₫`}
                </td>
                <td className="border border-border px-2 py-1">
                  {total < 0 ? "Hoàn tiền cho khách hàng" : ""}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-1 text-sm italic text-muted-foreground">
            (Bằng chữ: {numberToVietnameseWords(Math.abs(total))})
          </p>

          <p>
            <strong>Phương thức thanh toán:</strong>{" "}
            {paymentMethod || "Chưa chọn"}
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
          <Button onClick={handleExportPDF} disabled={!paymentMethod}>
            In hóa đơn
          </Button>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-sm font-medium">
            Phương thức thanh toán
          </span>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn phương thức" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Chuyển khoản">Chuyển khoản</SelectItem>
              <SelectItem value="Tiền mặt">Tiền mặt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
