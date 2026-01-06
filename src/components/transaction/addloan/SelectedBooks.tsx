"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { SelectedBooksProps } from "@/interfaces/addLoan";

const SelectedBooks: React.FC<SelectedBooksProps> = ({
  selectedBooks,
  onRemoveBook,
  borrowType,
  disableRemove,
}) => {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Sách đã chọn</h3>
      {selectedBooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có sách nào được chọn
        </p>
      ) : (
        <div className="space-y-2">
          {selectedBooks.map((book) => (
            <div
              key={book.copy_id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div>
                <p className="font-medium">{book.booktitle.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Mã bản sao: {book.copy_id}</Badge>
                  <Badge variant="outline">
                    {book.condition.condition_name}
                  </Badge>
                  {borrowType !== "Đọc tại chỗ" && (
                    <Badge variant="outline">
                      Giá: {book.price.toLocaleString()}đ
                    </Badge>
                  )}
                </div>
              </div>
              {!disableRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveBook(book.copy_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {borrowType !== "Đọc tại chỗ" && (
            <div className="mt-2 text-right">
              <p className="text-sm font-medium">
                Tổng tiền đặt cọc:{" "}
                {selectedBooks
                  .reduce((sum, book) => sum + book.price, 0)
                  .toLocaleString()}
                đ
              </p>
            </div>
          )}

          {borrowType === "Đọc tại chỗ" && (
            <div className="mt-2 rounded-md border border-border bg-muted p-3 text-muted-foreground">
              <p className="text-sm">
                Đọc tại chỗ: Không cần đặt cọc và sách phải được trả trong ngày.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectedBooks;
