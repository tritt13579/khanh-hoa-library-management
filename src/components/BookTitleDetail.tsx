"use client";
import React, { useState } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import BookCopyDetail from "./BookCopyDetail";
import BookCopyModal from "@/components/BookCopyModel";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BookTitleDetail = ({
  book,
  onClose,
  onEdit,
  onSuccess,
}: {
  book: any;
  onClose: () => void;
  onEdit: () => void;
  onSuccess?: () => void;
}) => {
  const { toast } = useToast();
  const [selectedCopy, setSelectedCopy] = useState<any>(null);
  const [showCopies, setShowCopies] = useState(false);
  const [activeModal, setActiveModal] = useState<"copy" | "edit" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingCopyId, setDeletingCopyId] = useState<number | null>(null);

  const [confirmDeleteBookOpen, setConfirmDeleteBookOpen] = useState(false);
  const [confirmDeleteCopyId, setConfirmDeleteCopyId] = useState<number | null>(
    null,
  );

  if (!book) return null;

  const handleCopyClick = (copy: any) => {
    setSelectedCopy(copy);
  };

  const handleBackToTitle = () => {
    setSelectedCopy(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/book/delete?book_title_id=${book.book_title_id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: data.error || "Không thể xóa, vui lòng thử lại.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Xóa sách thành công", variant: "success" });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      toast({ title: "Lỗi hệ thống. Không thể xóa.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setConfirmDeleteBookOpen(false);
    }
  };

  const handleDeleteCopy = async (copyId: number) => {
    setDeletingCopyId(copyId);
    try {
      const res = await fetch(`/api/book/deletecopy`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy_id: copyId }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: result.error || "Xóa bản sao thất bại",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Xóa bản sao thành công", variant: "success" });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      toast({ title: "Lỗi hệ thống khi xóa bản sao", variant: "destructive" });
    } finally {
      setDeletingCopyId(null);
      setConfirmDeleteCopyId(null);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-h-full max-w-md sm:max-w-xl md:max-h-[90vh] lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chi tiết sách</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 w-full flex-col lg:flex-row">
            {selectedCopy ? (
              <BookCopyDetail
                bookTitle={book}
                bookCopy={selectedCopy}
                onBack={handleBackToTitle}
                onSuccess={onSuccess}
                onClose={onClose}
              />
            ) : (
              <>
                <div className="mb-2 max-h-[75vh] w-full overflow-y-auto pr-2 lg:mb-0 lg:w-2/3">
                  <h2 className="text-3xl font-semibold text-primary">
                    {book.title}
                  </h2>
                  <p className="mt-2 text-lg text-muted-foreground">
                    Tác giả:{" "}
                    {book.iswrittenby?.[0]?.author?.author_name ?? "Không rõ"}
                  </p>
                  <div className="mt-6 space-y-3 text-muted-foreground">
                    <p>
                      <strong className="text-primary">Thể loại:</strong>{" "}
                      {book.category?.category_name ?? "Không rõ"}
                    </p>
                    <p>
                      <strong className="text-primary">Năm xuất bản:</strong>{" "}
                      {book.publication_year ?? "N/A"}
                    </p>
                    <p>
                      <strong className="text-primary">ISBN:</strong>{" "}
                      {book.isbn ?? "N/A"}
                    </p>
                    <p>
                      <strong className="text-primary">Kệ sách:</strong>{" "}
                      {book.shelf?.location ?? "N/A"}
                    </p>
                    <p>
                      <strong className="text-primary">Ngôn ngữ:</strong>{" "}
                      {book.language ?? "Tiếng Việt"}
                    </p>
                    <p>
                      <strong className="text-primary">Nhà xuất bản:</strong>{" "}
                      {book.publisher?.publisher_name ?? "Không rõ"}
                    </p>
                    <p>
                      <strong className="text-primary">Lần sửa đổi:</strong>{" "}
                      {book.edition ?? "N/A"}
                    </p>
                  </div>
                  <div className="mt-6">
                    <strong className="text-primary">Mô tả:</strong>
                    <p className="mt-2 text-muted-foreground">
                      {book.description ?? "Không có mô tả."}
                    </p>
                  </div>

                  <div className="mt-6">
                    <div
                      className="flex cursor-pointer items-center justify-between"
                      onClick={() => setShowCopies(!showCopies)}
                    >
                      <div className="flex items-center">
                        {showCopies ? (
                          <ChevronDownIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-primary" />
                        )}
                        <h3 className="ml-1 text-lg font-semibold text-primary">
                          Các bản sao ({book.bookcopy?.length || 0})
                        </h3>
                      </div>
                      {showCopies && (
                        <Button
                          variant="outline"
                          className="text-sm"
                          onClick={() => setActiveModal("copy")}
                        >
                          + Thêm bản sao
                        </Button>
                      )}
                    </div>

                    {showCopies && book.bookcopy?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {book.bookcopy.map((copy: any) => (
                          <div
                            key={copy.copy_id}
                            className="group rounded-md border p-3 hover:bg-muted"
                          >
                            <div className="flex items-start justify-between">
                              <div
                                className="cursor-pointer"
                                onClick={() => handleCopyClick(copy)}
                              >
                                <p className="font-medium text-primary">
                                  Mã bản sao: {copy.copy_id}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Tình trạng:{" "}
                                  {copy.condition?.condition_name || "Không rõ"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Trạng thái:{" "}
                                  {copy.availability_status || "Không rõ"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Ngày nhập:{" "}
                                  {new Date(
                                    copy.acquisition_date,
                                  ).toLocaleDateString("vi-VN")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Giá: {copy.price.toLocaleString("vi-VN")} VNĐ
                                </p>
                              </div>
                              <button
                                className="ml-4 text-sm text-red-600 hover:underline"
                                disabled={deletingCopyId === copy.copy_id}
                                onClick={() =>
                                  setConfirmDeleteCopyId(copy.copy_id)
                                }
                              >
                                {deletingCopyId === copy.copy_id
                                  ? "Đang xóa..."
                                  : "Xóa"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {showCopies &&
                      (!book.bookcopy || book.bookcopy.length === 0) && (
                        <p className="mt-2 text-sm italic text-muted-foreground">
                          Không có bản sao nào
                        </p>
                      )}
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <Button variant="default" onClick={onClose}>
                      <XMarkIcon className="h-5 w-5" />
                      Đóng
                    </Button>
                    <Button variant="default" onClick={onEdit}>
                      <PencilSquareIcon className="h-5 w-5" />
                      Sửa
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmDeleteBookOpen(true)}
                      disabled={isDeleting}
                    >
                      <TrashIcon className="h-5 w-5" />
                      {isDeleting ? "Đang xóa..." : "Xóa"}
                    </Button>
                  </div>
                </div>
                <div className="hidden w-full lg:block lg:w-1/2">
                  <img
                    src={book.cover_image || "/api/placeholder/400/600"}
                    alt={`Ảnh bìa ${book.title}`}
                    className="h-full w-full rounded-lg object-cover shadow-lg"
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal xác nhận xóa sách */}
      <Dialog
        open={confirmDeleteBookOpen}
        onOpenChange={setConfirmDeleteBookOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bạn có chắc chắn muốn xóa sách này?</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteBookOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal xác nhận xóa bản sao */}
      <Dialog
        open={confirmDeleteCopyId !== null}
        onOpenChange={() => setConfirmDeleteCopyId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bạn có chắc chắn muốn xóa bản sao này?</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteCopyId(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDeleteCopyId && handleDeleteCopy(confirmDeleteCopyId)
              }
              disabled={deletingCopyId === confirmDeleteCopyId}
            >
              {deletingCopyId === confirmDeleteCopyId ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BookCopyModal
        isOpen={activeModal === "copy"}
        onClose={() => setActiveModal(null)}
        bookTitle={{ title: book.title }}
        bookTitleId={book.book_title_id}
        onSuccess={() => {
          setActiveModal(null);
        }}
      />
    </>
  );
};

export default BookTitleDetail;
