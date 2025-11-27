"use client";

import React, { useState, useEffect, useCallback } from "react";
import BookFormModal from "@/components/BookFormModel";
import FileUploadModal from "@/components/FileUploadModel";
import BookCard from "./bookCard";
import { supabaseClient } from "@/lib/client";

import {
  Bars3Icon,
  XMarkIcon,
  FolderPlusIcon,
  ArrowUpOnSquareIcon,
} from "@heroicons/react/24/solid";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import BookTitleDetail from "@/components/BookTitleDetail";
import { useToast } from "@/hooks/use-toast";

const BooksPage = () => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookCodeQuery, setBookCodeQuery] = useState("");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFileOpend, setIsFileOpend] = useState(false);
  const [isCategory, setIsCategory] = useState(false);
  const [uploadType, setUploadType] = useState<"bookTitle" | "bookCopy" | null>(
    null,
  );

  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchBooks = useCallback(async () => {
    try {
      const supabase = supabaseClient();
      const { data, error } = await supabase.from("booktitle").select(`
          *,
          category:category_id(category_name),
          iswrittenby!inner (
            author:author_id ( author_name )
          ),
          bookcopy(*,
            condition:condition_id(condition_name, description),
            availability_status
          ),
          shelf:shelf_id(location),
          publisher:publisher_id(publisher_name)
        `);

      if (error) {
        console.error("Error fetching books:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách sách. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      } else {
        setBooks(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch books:", err);
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi tải dữ liệu.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const supabase = supabaseClient();
      const { data, error } = await supabase.from("category").select("*");

      if (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách thể loại.",
          variant: "destructive",
        });
      } else {
        const names = data.map((c: any) => c.category_name);
        setCategories(["Tất cả", ...names]);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, [toast]);

  // Initial data loading
  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, [fetchBooks, fetchCategories]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchBooks();
    }
  }, [refreshTrigger, fetchBooks]);

  const filterByCopyId = (books: any[]) => {
    const trimmed = bookCodeQuery.trim();
    if (!trimmed) return books;
    return books.filter((book) =>
      book.bookcopy?.some((copy: any) => String(copy.copy_id) === trimmed),
    );
  };

  const getBooksByCategory = (category: string) => {
    let filtered = books.filter((book) => {
      const matchCategory =
        category === "Tất cả" || book.category?.category_name === category;

      const matchSearch =
        book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.iswrittenby?.[0]?.author?.author_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchCategory && matchSearch;
    });

    if (bookCodeQuery.trim()) {
      filtered = filterByCopyId(filtered);
    }

    return filtered;
  };

  const toggleExpand = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const opendModel = (
    model: "detail" | "add" | "edit" | "file" | "category",
    book: any = null,
    type: "bookTitle" | "bookCopy" | null = null,
  ) => {
    setIsDetailOpen(model === "detail");
    setIsAddOpen(model === "add");
    setIsEditOpen(model === "edit");
    setIsFileOpend(model === "file");
    setIsCategory(model === "category");

    if (model === "file") {
      setUploadType(type);
    }

    if (model === "detail" || model === "edit") {
      setSelectedBook(book);
    } else {
      setSelectedBook(null);
    }
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);

    toast({
      title: "Thành công",
      description: "Dữ liệu đã được cập nhật thành công.",
      variant: "success",
    });
  };

  const closeModal = () => {
    setIsDetailOpen(false);
    setSelectedBook(null);
    setIsAddOpen(false);
    setIsEditOpen(false);
    setIsFileOpend(false);
    setIsCategory(false);
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Tác giả / Sách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-[150px] flex-1 py-6"
          />
          <Input
            placeholder="Mã sách..."
            value={bookCodeQuery}
            onChange={(e) => setBookCodeQuery(e.target.value)}
            className="min-w-[150px] flex-1 py-6"
          />
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value)}
          >
            <SelectTrigger className="min-w-[150px] flex-1 py-6">
              <SelectValue placeholder="Chọn thể loại" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat, i) => (
                <SelectItem key={i} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden space-x-2 md:flex">
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => opendModel("add")}
          >
            <FolderPlusIcon className="h-4 w-4 text-[#0071BC]" />
            <span className="text-sm">Thêm sách</span>
          </Button>

          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => opendModel("file", null, "bookTitle")}
          >
            <ArrowUpOnSquareIcon className="h-4 w-4 text-[#0071BC]" />
            <span className="text-sm">Tải lên tựa sách</span>
          </Button>

          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => opendModel("file", null, "bookCopy")}
          >
            <ArrowUpOnSquareIcon className="h-4 w-4 text-[#0071BC]" />
            <span className="text-sm">Tải lên bản sao</span>
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex justify-start p-4 md:hidden"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Filter Buttons */}
      {isMobileMenuOpen && (
        <div className="mt-4 flex flex-col space-y-4 md:hidden">
          <ActionButton
            icon={<FolderPlusIcon className="h-4 w-4 text-[#0071BC]" />}
            label="Thêm sách"
            onClick={() => opendModel("add")}
          />
          <ActionButton
            icon={<ArrowUpOnSquareIcon className="h-4 w-4 text-[#0071BC]" />}
            label="Tải lên tựa sách"
            onClick={() => opendModel("file", null, "bookTitle")}
          />
          <ActionButton
            icon={<ArrowUpOnSquareIcon className="h-4 w-4 text-[#0071BC]" />}
            label="Tải lên bản sao"
            onClick={() => opendModel("file", null, "bookCopy")}
          />
        </div>
      )}

      {isFileOpend && uploadType && (
        <FileUploadModal
          isOpen={isFileOpend}
          onClose={closeModal}
          onSuccess={handleSuccess}
          uploadUrl={
            uploadType === "bookTitle"
              ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/book/uploadtitle`
              : `${process.env.NEXT_PUBLIC_BASE_URL}/api/book/uploadcopy`
          }
          title={
            uploadType === "bookTitle"
              ? "Tải lên file tựa sách"
              : "Tải lên file bản sao"
          }
          description={
            uploadType === "bookTitle"
              ? "Chọn file Excel chứa thông tin tựa sách để tải lên."
              : "Chọn file Excel chứa thông tin bản sao sách để tải lên."
          }
        />
      )}

      <BookFormModal
        isOpen={isAddOpen || isEditOpen}
        isEdit={isEditOpen}
        book={selectedBook}
        onSuccess={handleSuccess}
        onClose={closeModal}
      />

      {isDetailOpen && selectedBook && (
        <BookTitleDetail
          book={selectedBook}
          onClose={closeModal}
          onEdit={() => opendModel("edit", selectedBook)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Books status */}
      {books.length === 0 && (
        <div className="my-10 text-center text-gray-500">
          {refreshTrigger > 0
            ? "Đang tải sách..."
            : "Không có sách nào được tìm thấy."}
        </div>
      )}

      {/* Book Grid by Category */}
      {(selectedCategory === "Tất cả"
        ? categories.filter((c) => c !== "Tất cả")
        : [selectedCategory]
      ).map((category) => {
        const booksInCategory = getBooksByCategory(category);
        if (booksInCategory.length === 0) return null;

        const isExpanded = expandedCategories.includes(category);
        const visibleBooks = isExpanded
          ? booksInCategory
          : booksInCategory.slice(0, 4);

        return (
          <div key={category} className="book-category-section">
            <div className="mb-4 mt-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-primary">{category}</h2>
              {booksInCategory.length > 4 && (
                <Button
                  variant="outline"
                  onClick={() => toggleExpand(category)}
                >
                  {isExpanded ? "Thu gọn ↑" : "Xem thêm →"}
                </Button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {visibleBooks.map((book, index) => (
                <div
                  key={`${book.book_title_id || index}`}
                  onClick={() => opendModel("detail", book)}
                >
                  <BookCard
                    title={book.title}
                    author={
                      book.iswrittenby?.[0]?.author?.author_name ?? "Không rõ"
                    }
                    image={book.cover_image}
                    category={book.category?.category_name}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ActionButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => (
  <Button
    variant="outline"
    className="flex justify-start space-x-2"
    onClick={onClick}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </Button>
);

export default BooksPage;
