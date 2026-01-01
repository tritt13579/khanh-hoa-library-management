"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/client";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  BookOpenIcon,
} from "@heroicons/react/24/solid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";

const ReserveBookButton = dynamic(() => import("@/components/reader/ReserveBookButton"), { ssr: false });

// Định nghĩa types
type Author = {
  author_id?: string;
  author_name: string;
};

type Category = {
  category_id?: string;
  category_name: string;
};

type Shelf = {
  shelf_id?: string;
  location: string;
};

type Publisher = {
  publisher_id?: string;
  publisher_name: string;
};

type Condition = {
  condition_id?: string;
  condition_name: string;
  description?: string;
};

type BookCopy = {
  book_copy_id?: string;
  copy_id?: string;
  condition_id?: string;
  condition?: Condition;
  acquisition_date?: string;
  availability_status: "Có sẵn" | "Đang mượn" | "Thất lạc" | "Đặt trước";
};

type BookTitle = {
  book_title_id: string;
  title: string;
  cover_image?: string;
  publication_year?: number;
  isbn?: string;
  description?: string;
  language?: string;
  edition?: string;
  category?: Category;
  shelf?: Shelf;
  publisher?: Publisher;
  authors?: Author[];
  bookcopy?: BookCopy[];
  // Thống kê trạng thái
  available_count: number;
  borrowed_count: number;
  reserved_count: number;
  total_copies: number;
};

const booksPerPage = 12;

// Hàm chuẩn hóa dấu cho tiếng Việt
const normalizeVietnamese = (str: string | undefined): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const SearchPage = () => {
  const [bookTitles, setBookTitles] = useState<BookTitle[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<BookTitle[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState<BookTitle | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [titleFilter, setTitleFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [shelfFilter, setShelfFilter] = useState("all");
  const [publisherFilter, setPublisherFilter] = useState("all");
  const [sortOption, setSortOption] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const startIdx = (currentPage - 1) * booksPerPage;
  const currentBooks = filteredBooks.slice(startIdx, startIdx + booksPerPage);

  const goToPrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNext = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  function shuffleArray<T>(array: T[]): T[] {
    return [...array]
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  useEffect(() => {
    const fetchBooks = async () => {
      const supabase = supabaseClient();
      const { data, error } = await supabase
        .from("booktitle")
        .select(
          `*, category:category_id(category_name), iswrittenby!inner (author:author_id ( author_name )), bookcopy(*, condition:condition_id(condition_name, description)), shelf:shelf_id(location), publisher:publisher_id(publisher_name)`,
        );

      if (error) {
        console.error("Error fetching books:", error);
      } else if (data) {
        // Build maps to account for active holds and active loans so UI reflects reservation logic
        // Collect all copy ids and book title ids from fetched data
        const allCopyIds: number[] = [];
        const allBookTitleIds: number[] = [];
        data.forEach((bt: any) => {
          allBookTitleIds.push(bt.book_title_id);
          (bt.bookcopy || []).forEach((c: any) => {
            if (c && (c.copy_id || c.book_copy_id)) {
              allCopyIds.push(c.copy_id || c.book_copy_id);
            }
          });
        });

        // Query active reservation holds (not expired)
        let heldCopyIds = new Set<number>();
        if (allCopyIds.length > 0) {
          const { data: holdData, error: holdError } = await supabase
            .from("reservation_hold")
            .select("copy_id, expires_at")
            .in("copy_id", allCopyIds)
            .gt("expires_at", new Date().toISOString());
          if (!holdError && Array.isArray(holdData)) {
            holdData.forEach((h: any) => {
              if (h.copy_id) heldCopyIds.add(h.copy_id);
            });
          }
        }

        // Query active loans (return_date is null)
        let loanedCopyIds = new Set<number>();
        if (allCopyIds.length > 0) {
          const { data: loanData, error: loanError } = await supabase
            .from("loandetail")
            .select("copy_id")
            .is("return_date", null)
            .in("copy_id", allCopyIds);
          if (!loanError && Array.isArray(loanData)) {
            loanData.forEach((l: any) => {
              if (l.copy_id) loanedCopyIds.add(l.copy_id);
            });
          }
        }

        // Query reservations per book_title to compute queued/ready counts
        const reservationCountsMap = new Map<number, { queued: number; ready: number }>();
        if (allBookTitleIds.length > 0) {
          const { data: resData, error: resError } = await supabase
            .from("reservation")
            .select("book_title_id, reservation_status")
            .in("book_title_id", allBookTitleIds);
          if (!resError && Array.isArray(resData)) {
            resData.forEach((r: any) => {
              const id = r.book_title_id;
              const m = reservationCountsMap.get(id) || { queued: 0, ready: 0 };
              if (r.reservation_status === "Chờ xử lý") m.queued += 1;
              if (r.reservation_status === "Sẵn sàng") m.ready += 1;
              reservationCountsMap.set(id, m);
            });
          }
        }

        // Chuyển đổi dữ liệu thành danh sách các book title với thống kê (consider holds & loans)
        const processedTitles = data.map((booktitle: any) => {
          const copies =
            booktitle.bookcopy?.filter(
              (copy: any) => copy.availability_status !== "Thất lạc",
            ) || [];

          const total_copies = copies.length;

          // compute available by excluding loaned copies and currently held copies
          const available_count = copies.filter((copy: any) => {
            const cid = copy.copy_id || copy.book_copy_id;
            if (!cid) return false;
            if (loanedCopyIds.has(cid)) return false;
            if (heldCopyIds.has(cid)) return false;
            return true;
          }).length;

          const borrowed_count = copies.filter((copy: any) => {
            const cid = copy.copy_id || copy.book_copy_id;
            return cid && loanedCopyIds.has(cid);
          }).length;

          // reserved_count based on reservation table (queued + ready)
          const rc = reservationCountsMap.get(booktitle.book_title_id) || { queued: 0, ready: 0 };
          const reserved_count = rc.queued + rc.ready;

          return {
            book_title_id: booktitle.book_title_id,
            title: booktitle.title,
            cover_image: booktitle.cover_image,
            publication_year: booktitle.publication_year,
            isbn: booktitle.isbn,
            description: booktitle.description,
            language: booktitle.language,
            edition: booktitle.edition,
            category: booktitle.category,
            shelf: booktitle.shelf,
            publisher: booktitle.publisher,
            authors: booktitle.iswrittenby?.map((w: any) => w.author),
            bookcopy: copies,
            available_count,
            borrowed_count,
            reserved_count,
            total_copies,
          } as BookTitle;
        });

        // Lọc bỏ những sách không có bản copy nào
        const availableTitles = processedTitles.filter(
          (title) => title.total_copies > 0,
        );
        const shuffledTitles = shuffleArray(availableTitles);

        setBookTitles(shuffledTitles);
        setFilteredBooks(shuffledTitles);
      }
    };

    fetchBooks();
  }, []);

  const handleSearch = () => {
    let filtered = [...bookTitles];

    // Tìm kiếm theo tiêu đề với chuẩn hóa dấu tiếng Việt
    if (titleFilter.trim()) {
      const normalizedTitle = normalizeVietnamese(titleFilter);
      filtered = filtered.filter((b) =>
        normalizeVietnamese(b.title).includes(normalizedTitle),
      );
    }

    // Lọc theo tác giả
    if (authorFilter !== "all") {
      filtered = filtered.filter((b) =>
        b.authors?.some(
          (a) =>
            normalizeVietnamese(a.author_name) ===
            normalizeVietnamese(authorFilter),
        ),
      );
    }

    // Lọc theo thể loại
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (b) =>
          normalizeVietnamese(b.category?.category_name) ===
          normalizeVietnamese(categoryFilter),
      );
    }

    // Lọc theo kệ sách
    if (shelfFilter !== "all") {
      filtered = filtered.filter(
        (b) =>
          normalizeVietnamese(b.shelf?.location) ===
          normalizeVietnamese(shelfFilter),
      );
    }

    // Lọc theo nhà xuất bản
    if (publisherFilter !== "all") {
      filtered = filtered.filter(
        (b) =>
          normalizeVietnamese(b.publisher?.publisher_name) ===
          normalizeVietnamese(publisherFilter),
      );
    }

    // Lọc theo tình trạng có sẵn
    if (availabilityFilter !== "all") {
      if (availabilityFilter === "Có sẵn") {
        filtered = filtered.filter((b) => b.available_count > 0);
      } else if (availabilityFilter === "Đang mượn") {
        filtered = filtered.filter((b) => b.borrowed_count > 0);
      } else if (availabilityFilter === "Đặt trước") {
        filtered = filtered.filter((b) => b.reserved_count > 0);
      }
    }

    // Sắp xếp
    if (sortOption === "theoten") {
      filtered.sort((a, b) => {
        const titleA = normalizeVietnamese(a.title || "");
        const titleB = normalizeVietnamese(b.title || "");
        return titleA.localeCompare(titleB);
      });
    } else if (sortOption === "namphathanh") {
      filtered.sort(
        (a, b) => (b.publication_year || 0) - (a.publication_year || 0),
      );
    } else if (sortOption === "soluong") {
      filtered.sort((a, b) => b.total_copies - a.total_copies);
    }

    setFilteredBooks(filtered);
    setCurrentPage(1);
  };

  // Hàm lấy màu dựa trên trạng thái sách
  const getStatusColor = (status: string | undefined): string => {
    switch (status) {
      case "Có sẵn":
        return "text-primary bg-accent border-border";
      case "Đang mượn":
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "Đặt trước":
        return "text-chart-1 bg-chart-1/10 border-chart-1/20";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  const handleBookClick = (book: BookTitle) => {
    setSelectedBook(book);
    setIsDetailOpen(true);
  };

  return (
    <div className="w-full space-y-6 px-4 sm:px-6 lg:px-12">
      <h1 className="text-2xl font-bold text-foreground">Tìm kiếm tài liệu</h1>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Input
          type="text"
          placeholder="Nhập tên sách..."
          className="flex-1"
          value={titleFilter}
          onChange={(e) => setTitleFilter(e.target.value)}
        />
        <Button className="flex gap-1" onClick={handleSearch}>
          <MagnifyingGlassIcon className="h-5 w-5" />
          Tìm kiếm
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-[160px] flex-1 flex-col">
          <label className="mb-1 text-sm font-medium text-foreground">
            Tác giả
          </label>
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="min-w-[160px] flex-1">
              <SelectValue placeholder="Tác giả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {[
                ...new Set(
                  bookTitles.flatMap((b) =>
                    b.authors?.map((a) => a.author_name),
                  ),
                ),
              ]
                .filter(Boolean)
                .map((name, i) => (
                  <SelectItem key={i} value={name || ""}>
                    {name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col">
          <label className="mb-1 text-sm font-medium text-foreground">
            Thể loại
          </label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="min-w-[160px] flex-1">
              <SelectValue placeholder="Thể loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {[...new Set(bookTitles.map((b) => b.category?.category_name))]
                .filter(Boolean)
                .map((cat, i) => (
                  <SelectItem key={i} value={cat || ""}>
                    {cat}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col">
          <label className="mb-1 text-sm font-medium text-foreground">
            Kệ sách
          </label>
          <Select value={shelfFilter} onValueChange={setShelfFilter}>
            <SelectTrigger className="min-w-[160px] flex-1">
              <SelectValue placeholder="Kệ sách" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {[...new Set(bookTitles.map((b) => b.shelf?.location))]
                .filter(Boolean)
                .map((loc, i) => (
                  <SelectItem key={i} value={loc || ""}>
                    {loc}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col">
          <label className="mb-1 text-sm font-medium text-foreground">
            Nhà xuất bản
          </label>
          <Select value={publisherFilter} onValueChange={setPublisherFilter}>
            <SelectTrigger className="min-w-[160px] flex-1">
              <SelectValue placeholder="Nhà xuất bản" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {[...new Set(bookTitles.map((b) => b.publisher?.publisher_name))]
                .filter(Boolean)
                .map((pub, i) => (
                  <SelectItem key={i} value={pub || ""}>
                    {pub}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col">
          <label className="mb-1 text-sm font-medium text-foreground">
            Tình trạng
          </label>
          <Select
            value={availabilityFilter}
            onValueChange={setAvailabilityFilter}
          >
            <SelectTrigger className="min-w-[160px] flex-1">
              <SelectValue placeholder="Tình trạng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="Có sẵn">Có sẵn</SelectItem>
              <SelectItem value="Đang mượn">Đang mượn</SelectItem>
              <SelectItem value="Đặt trước">Đặt trước</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col">
          <label className="mb-1 text-sm font-medium text-foreground">
            Sắp xếp theo
          </label>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="min-w-[160px] flex-1">
              <SelectValue placeholder="Sắp xếp theo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="theoten">Theo tên (A-Z)</SelectItem>
              <SelectItem value="namphathanh">
                Năm phát hành mới nhất
              </SelectItem>
              <SelectItem value="soluong">Số lượng bản copy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-muted-foreground">
        Tổng số {filteredBooks.length} đầu sách
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {currentBooks.map((book, index) => (
          <div
            key={index}
            className="group transform cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            onClick={() => handleBookClick(book)}
          >
            <div className="h-52 overflow-hidden">
              <img
                src={book.cover_image || "/placeholder.jpg"}
                alt={book.title || "Sách"}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="space-y-2 p-4">
              <h2 className="line-clamp-2 text-lg font-semibold text-card-foreground">
                {book.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                Tác giả: {book.authors?.[0]?.author_name || "Không rõ"}
                {book.authors &&
                  book.authors.length > 1 &&
                  ` (+${book.authors.length - 1})`}
              </p>
              <p className="text-sm text-muted-foreground">
                Thể loại: {book.category?.category_name || "Không rõ"}
              </p>
              <p className="text-sm text-muted-foreground">
                NXB: {book.publisher?.publisher_name || "Không rõ"}
              </p>
              <p className="text-sm text-muted-foreground">
                Năm: {book.publication_year || "Không rõ"}
              </p>

              <div className="flex flex-wrap gap-1 pt-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                  {book.total_copies} bản
                </span>
                {book.available_count > 0 && (
                  <span className="rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">
                    {book.available_count} có sẵn
                  </span>
                )}
                {book.borrowed_count > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    {book.borrowed_count} đang mượn
                  </span>
                )}
                {book.reserved_count > 0 && (
                  <span className="rounded-full bg-chart-1/10 px-2 py-1 text-xs text-chart-1">
                    {book.reserved_count} đặt trước
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpenIcon className="h-4 w-4" />
                <span>Click để xem chi tiết</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 0 && (
        <div className="mt-4 flex items-center justify-center gap-4 pb-4">
          <Button
            onClick={goToPrev}
            disabled={currentPage === 1}
            variant="outline"
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {currentPage} / {totalPages}
          </span>
          <Button
            onClick={goToNext}
            disabled={currentPage === totalPages}
            variant="outline"
          >
            Sau
          </Button>
        </div>
      )}

      {/* Dialog chi tiết sách */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Chi tiết sách
            </DialogTitle>
          </DialogHeader>

          {selectedBook && (
            <div className="space-y-6">
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="md:w-1/3">
                  <img
                    src={selectedBook.cover_image || "/placeholder.jpg"}
                    alt={selectedBook.title}
                    className="w-full rounded-lg shadow-md"
                  />
                </div>

                <div className="space-y-4 md:w-2/3">
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedBook.title}
                  </h2>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">
                        Tác giả:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.authors
                          ?.map((a) => a.author_name)
                          .join(", ") || "Không rõ"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Thể loại:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.category?.category_name || "Không rõ"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Nhà xuất bản:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.publisher?.publisher_name || "Không rõ"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Năm phát hành:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.publication_year || "Không rõ"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">ISBN:</span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.isbn || "Không rõ"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Ngôn ngữ:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.language || "Không rõ"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Phiên bản:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.edition || "Không rõ"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Vị trí:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {selectedBook.shelf?.location || "Không rõ"}
                      </span>
                    </div>
                  </div>

                  {selectedBook.description && (
                    <div>
                      <span className="font-medium text-foreground">
                        Mô tả:
                      </span>
                      <p className="mt-1 text-muted-foreground">
                        {selectedBook.description}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                        Tổng: {selectedBook.total_copies} bản
                      </span>
                      <span className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
                        Có sẵn: {selectedBook.available_count}
                      </span>
                      <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
                        Đang mượn: {selectedBook.borrowed_count}
                      </span>
                      <span className="rounded-full bg-chart-1/10 px-3 py-1 text-sm text-chart-1">
                        Đặt trước: {selectedBook.reserved_count}
                      </span>
                    </div>
                  </div>
                    <div className="ml-auto">
                      <ReserveBookButton bookTitleId={selectedBook.book_title_id} bookTitle={selectedBook.title} />
                    </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SearchPage;
