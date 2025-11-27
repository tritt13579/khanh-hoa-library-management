"use client";

import React, { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/solid";

interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend: (reader: any) => void;
  onCancel: (reader: any) => void;
  extendMonths: number;
  reader: any;
}

const CardDetailModal = ({
  isOpen,
  onClose,
  onExtend,
  onCancel,
  reader,
}: CardDetailModalProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");

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

  if (!reader) return null;

  const card = reader.librarycard?.[0];

  const getCardStatus = () => {
    switch (card?.card_status) {
      case "Đã hủy":
        return { text: "Đã hủy", className: "text-gray-500 font-semibold" };
      case "Chưa gia hạn":
        return {
          text: "Chưa gia hạn",
          className: "text-red-600 font-semibold",
        };
      case "Hoạt động":
        return {
          text: "Hoạt động",
          className: "text-green-600 font-semibold",
        };
      default:
        return {
          text: "Không rõ",
          className: "text-gray-400 font-semibold",
        };
    }
  };

  const status = getCardStatus();

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    // Đảm bảo tất cả ảnh đã tải xong trước
    const images = cardRef.current.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map((img) => {
        if (!img.complete) {
          return new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          });
        }
        return Promise.resolve();
      }),
    );

    // Detect current theme
    const isDarkMode =
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
        foreignObjectRendering: false,
        removeContainer: true,
        logging: false,
        ignoreElements: (element) => {
          // Ignore elements that might cause OKLCH issues
          const computedStyle = window.getComputedStyle(element);
          const hasOklch =
            computedStyle.color?.includes("oklch") ||
            computedStyle.backgroundColor?.includes("oklch") ||
            computedStyle.borderColor?.includes("oklch");
          return (
            hasOklch ||
            element.tagName === "STYLE" ||
            element.tagName === "SCRIPT"
          );
        },
        onclone: (clonedDoc) => {
          // Apply fallback styles to prevent OKLCH issues
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              color: ${isDarkMode ? "#f8fafc" : "#000000"} !important;
              background-color: ${isDarkMode ? "#0f172a" : "#ffffff"} !important;
              border-color: ${isDarkMode ? "#374151" : "#d1d5db"} !important;
            }
            .text-primary {
              color: ${isDarkMode ? "#60a5fa" : "#3b82f6"} !important;
            }
            .text-gray-500 {
              color: ${isDarkMode ? "#9ca3af" : "#6b7280"} !important;
            }
            .text-gray-800 {
              color: ${isDarkMode ? "#f1f5f9" : "#1f2937"} !important;
            }
            .text-red-600 {
              color: ${isDarkMode ? "#ef4444" : "#dc2626"} !important;
            }
            .text-green-600 {
              color: ${isDarkMode ? "#22c55e" : "#16a34a"} !important;
            }
            .text-gray-400 {
              color: ${isDarkMode ? "#9ca3af" : "#6b7280"} !important;
            }
            .bg-white {
              background-color: ${isDarkMode ? "#0f172a" : "#ffffff"} !important;
            }
            .border {
              border-color: ${isDarkMode ? "#374151" : "#d1d5db"} !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const dataUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `the_thu_vien_${card?.card_number || "unknown"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải ảnh thẻ:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-full max-w-lg overflow-x-auto px-3 py-3 md:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-primary">
            Thẻ Thư Viện
          </DialogTitle>
        </DialogHeader>

        {/* Card Info Section */}
        <div
          ref={cardRef}
          className="relative flex min-h-[220px] min-w-[480px] flex-col rounded-lg border bg-card p-6 py-4 shadow-md"
        >
          {/* Header logo + tên thư viện */}
          <div className="mb-4 flex items-center gap-3">
            <img
              src="/images/logo/logoKH.jpg"
              alt="Logo Khánh Hòa"
              width={32}
              height={32}
              className="rounded-sm object-contain"
            />
            <span className="whitespace-nowrap text-base font-semibold text-primary">
              Thư viện Tỉnh Khánh Hòa
            </span>
          </div>

          {/* Nội dung thẻ: ảnh và thông tin */}
          <div className="flex h-[180px] w-full flex-row gap-6">
            {/* Ảnh thẻ */}
            <div className="flex-shrink-0">
              <img
                src={reader.photo_url || "/images/logo/avatar.jpg"}
                alt="Ảnh thẻ"
                width={120}
                height={180}
                className="rounded-md border object-cover shadow-md"
              />
            </div>

            {/* Thông tin thẻ */}
            <div className="flex w-full flex-col justify-start text-primary">
              <p className="mb-4 text-lg font-semibold text-primary">
                THẺ THƯ VIỆN
              </p>
              <div className="flex flex-col gap-1 text-sm text-card-foreground sm:text-base">
                <div>
                  <span className="font-semibold">Số thẻ:</span>{" "}
                  {card?.card_number || "N/A"}
                </div>
                <div>
                  <span className="font-semibold">Họ tên:</span>{" "}
                  {(reader.last_name || "") + " " + (reader.first_name || "") ||
                    "Họ tên"}
                </div>
                <div>
                  <span className="font-semibold">Loại thẻ:</span>{" "}
                  {card?.card_type || "Không rõ"}
                </div>
                <div>
                  <span className="font-semibold">Ngày hết hạn:</span>{" "}
                  {card?.expiry_date?.slice(0, 10) || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="w-full rounded-md border bg-card p-4 text-sm shadow-sm">
          <p className="text-card-foreground">
            <strong className="text-primary">Trạng thái thẻ:</strong>{" "}
            <span className={status.className}>{status.text}</span>
          </p>
          <p className="text-card-foreground">
            <strong className="text-primary">ID giao dịch:</strong>{" "}
            {card?.payment_id || "N/A"}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button type="button" className="gap-2" onClick={handleDownloadImage}>
            <ArrowDownTrayIcon className="h-4 w-4" />
            Tải xuống
          </Button>
          <Button
            type="button"
            onClick={() => onCancel(reader)}
            className="gap-2"
          >
            <NoSymbolIcon className="h-4 w-4" />
            Hủy thẻ
          </Button>
          <Button onClick={() => onExtend(reader)} className="gap-2">
            <CalendarDaysIcon className="h-4 w-4" />
            Gia hạn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardDetailModal;
