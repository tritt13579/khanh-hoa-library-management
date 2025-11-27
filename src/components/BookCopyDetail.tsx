"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import ConditionModal from "@/components/ConditionModel";
import { supabaseClient } from "@/lib/client";

const BookCopyDetail = ({
  bookTitle,
  bookCopy,
  onBack,
  onSuccess,
  onClose,
}: {
  bookTitle: any;
  bookCopy: any;
  onBack: () => void;
  onSuccess?: () => void;
  onClose?: () => void;
}) => {
  const [isConditionOpen, setIsConditionOpen] = useState(false);
  const [conditions, setConditions] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [currentCopy, setCurrentCopy] = useState(bookCopy);

  useEffect(() => {
    const fetchConditions = async () => {
      const supabase = supabaseClient();
      const { data, error } = await supabase.from("condition").select("*");

      if (error) {
        console.error("Lỗi lấy tình trạng:", error);
      } else {
        setConditions(
          data.map((item) => ({
            id: item.condition_id.toString(),
            name: item.condition_name,
          })),
        );
      }
    };

    fetchConditions();
  }, []);

  if (!bookCopy) return null;

  return (
    <div className="w-full px-4 py-2">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center text-primary hover:text-blue-700"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Quay lại
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <img
            src={bookTitle.cover_image || "/api/placeholder/300/450"}
            alt={`Ảnh bìa ${bookTitle.title}`}
            className="w-full rounded-md object-cover shadow-md"
          />
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-2 text-2xl font-semibold text-primary">
            {bookTitle.title}{" "}
            <span className="text-base text-muted-foreground">
              - Bản sao #{currentCopy.copy_id}
            </span>
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-md bg-accent p-4 text-accent-foreground">
              <h3 className="mb-3 text-lg font-medium text-primary">
                Thông tin bản sao
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong className="text-primary">Mã bản sao:</strong>{" "}
                  {currentCopy.copy_id}
                </li>
                <li>
                  <strong className="text-primary">Tình trạng:</strong>{" "}
                  {currentCopy.condition?.condition_name || "Không rõ"}
                </li>
                <li>
                  <strong className="text-primary">Trạng thái:</strong>{" "}
                  {currentCopy.availability_status || "Không rõ"}
                </li>
                <li>
                  <strong className="text-primary">Ngày nhập:</strong>{" "}
                  {new Date(currentCopy.acquisition_date).toLocaleDateString(
                    "vi-VN",
                  )}
                </li>
                <li>
                  <strong className="text-primary">Giá tiền:</strong>{" "}
                  {currentCopy.price.toLocaleString("vi-VN")} VNĐ
                </li>
              </ul>
              <button
                className="mt-2 rounded bg-background px-4 py-1.5 text-sm text-primary"
                onClick={() => setIsConditionOpen(true)}
              >
                Cập nhật tình trạng
              </button>
            </div>

            <div className="rounded-md border border-gray-200 p-4">
              <h3 className="mb-3 text-lg font-medium text-primary">
                Thông tin sách
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong className="text-primary">Tác giả:</strong>{" "}
                  {bookTitle.iswrittenby?.[0]?.author?.author_name ??
                    "Không rõ"}
                </li>
                <li>
                  <strong className="text-primary">Thể loại:</strong>{" "}
                  {bookTitle.category?.category_name ?? "Không rõ"}
                </li>
                <li>
                  <strong className="text-primary">Nhà xuất bản:</strong>{" "}
                  {bookTitle.publisher?.publisher_name ?? "Không rõ"}
                </li>
                <li>
                  <strong className="text-primary">Vị trí:</strong>{" "}
                  {bookTitle.shelf?.location ?? "N/A"}
                </li>
                <li>
                  <strong className="text-primary">ISBN:</strong>{" "}
                  {bookTitle.isbn ?? "N/A"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ConditionModal
        isOpen={isConditionOpen}
        onClose={() => setIsConditionOpen(false)}
        currentConditionId={currentCopy.condition?.condition_id?.toString()}
        conditions={conditions}
        copyId={currentCopy.copy_id}
        onSuccess={(updatedCondition) => {
          setIsConditionOpen(false);
          if (updatedCondition) {
            setCurrentCopy((prev: typeof bookCopy) => ({
              ...prev,
              condition: updatedCondition,
            }));
          }
          onSuccess?.();
          onBack();
          onClose?.();
        }}
      />
    </div>
  );
};

export default BookCopyDetail;
