"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { BookCopy, BookSearchProps } from "@/interfaces/addLoan";

const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const BookSearch: React.FC<BookSearchProps> = ({
  availableBooks,
  selectedBooks,
  onAddBook,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<BookCopy[]>([]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const normalizedSearchTerm = normalizeString(searchTerm);
    const filteredBooks = availableBooks.filter((book) => {
      const normalizedTitle = normalizeString(book.booktitle.title);

      const isAlreadySelected = selectedBooks.some(
        (selected) => selected.copy_id === book.copy_id,
      );

      return (
        normalizedTitle.includes(normalizedSearchTerm) && !isAlreadySelected
      );
    });

    setSearchResults(filteredBooks);
  }, [searchTerm, availableBooks, selectedBooks]);

  const handleAddBook = (book: BookCopy) => {
    onAddBook(book);
    setSearchTerm("");
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <FormLabel>Tìm sách</FormLabel>
        <div className="flex space-x-2">
          <Input
            placeholder="Nhập tên sách để tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-md border p-2">
          {searchResults.map((book) => (
            <div
              key={book.copy_id}
              className="flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-muted"
              onClick={() => handleAddBook(book)}
            >
              <span>
                <span className="font-medium">{book.booktitle.title}</span> -
                <span className="text-sm text-muted-foreground">
                  {" "}
                  Mã bản sao: {book.copy_id}
                </span>{" "}
                -
                <span className="text-sm">
                  {" "}
                  {book.condition.condition_name}
                </span>{" "}
                <span className="text-sm font-semibold">
                  {" "}
                  Giá: {book.price.toLocaleString()}đ
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBook(book);
                }}
              >
                Thêm
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookSearch;
