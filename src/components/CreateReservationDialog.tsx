"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/client";

interface Reader {
  id: number;
  name: string;
  cardNumber: string;
  cardId: number;
}

interface Book {
  id: number;
  title: string;
  author: string;
}

const normalizeString = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReservationCreated: () => void;
}

export const CreateReservationDialog: React.FC<
  CreateReservationDialogProps
> = ({ open, onOpenChange, onReservationCreated }) => {
  const supabase = supabaseClient();
  const [readerLoading, setReaderLoading] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [readerValid, setReaderValid] = useState<boolean | null>(null);
  const [bookValid, setBookValid] = useState<boolean | null>(null);

  // Reader selection
  const [readerSearch, setReaderSearch] = useState("");
  const [readers, setReaders] = useState<Reader[]>([]);
  const [selectedReader, setSelectedReader] = useState<Reader | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);

  // Book selection
  const [bookSearch, setBookSearch] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookOpen, setBookOpen] = useState(false);

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<any>(null);

  const { toast } = useToast();

  // Fetch readers
  const fetchReaders = async () => {
    try {
      setReaderLoading(true);
      const { data, error } = await supabase
        .from("librarycard")
        .select(
          `
          card_id,
          card_number,
          card_status,
          reader:reader_id (
            reader_id,
            first_name,
            last_name
          )
        `
        )
        .eq("card_status", "Hoạt động")
        .order("card_id", { ascending: true });

      if (error) throw error;

      const formattedReaders = (data || [])
        .map((card: any) => {
          const reader = Array.isArray(card.reader)
            ? card.reader[0]
            : card.reader;

          if (!reader) return null;

          return {
            id: reader.reader_id,
            name: `${reader.last_name} ${reader.first_name}`.trim(),
            cardNumber: card.card_number,
            cardId: card.card_id,
          };
        })
        .filter(Boolean) as Reader[];

      setReaders(formattedReaders);
    } catch (error) {
      console.error("Error fetching readers:", error);
      setReaders([]);
    } finally {
      setReaderLoading(false);
    }
  };

  // Fetch books
  const fetchBooks = async () => {
    try {
      setBookLoading(true);
      const { data, error } = await supabase
        .from("booktitle")
        .select(
          `
          book_title_id,
          title,
          iswrittenby (
            author:author_id (
              author_name
            )
          )
        `
        )
        .order("title", { ascending: true });

      if (error) throw error;

      const formattedBooks = (data || []).map((book: any) => {
        const authors = new Set<string>();
        (book.iswrittenby || []).forEach((item: any) => {
          const authorObj = Array.isArray(item.author)
            ? item.author[0]
            : item.author;
          if (authorObj?.author_name) {
            authors.add(authorObj.author_name);
          }
        });

        return {
          id: book.book_title_id,
          title: book.title,
          author: authors.size > 0 ? Array.from(authors).join(", ") : "Unknown Author",
        };
      });

      setBooks(formattedBooks);
    } catch (error) {
      console.error("Error fetching books:", error);
      setBooks([]);
    } finally {
      setBookLoading(false);
    }
  };

  // Validate reader (check reservation count)
  const validateReader = async (cardId: number) => {
    try {
      const response = await fetch(`/api/reservations/reader/${cardId}`);
      const result = await response.json();

      if (result.success) {
        if (!result.data.can_reserve_more) {
          setValidationError(
            `Độc giả đã đạt giới hạn 3 đặt trước (hiện có ${result.data.active_count} đặt trước đang hoạt động)`
          );
          return false;
        }
        setValidationError(null);
        return true;
      }
    } catch (error) {
      console.error("Error validating reader:", error);
    }
    return false;
  };

  // Check book availability
  const checkAvailability = async (bookId: number) => {
    try {
      const response = await fetch("/api/reservations/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ book_title_id: bookId }),
      });
      const result = await response.json();

      if (result.success) {
        setAvailability(result.data);
        if (!result.data.is_reservable) {
          setValidationError(result.data.reason || "Sách này không thể đặt trước");
          return false;
        }
        // Reservable: allow even if copies available. Clear validation and proceed.
        setValidationError(null);
        return true;
      }
    } catch (error) {
      console.error("Error checking availability:", error);
    }
    return false;
  };

  // Handle reader selection
  const handleReaderSelect = async (reader: Reader) => {
    setSelectedReader(reader);
    setReaderOpen(false);
    setReaderSearch("");
    setValidationError(null);
    setReaderValid(null);

    const isValid = await validateReader(reader.cardId);
    setReaderValid(isValid);
  };

  // Handle book selection
  const handleBookSelect = async (book: Book) => {
    setSelectedBook(book);
    setBookOpen(false);
    setBookSearch("");
    setValidationError(null);
    setAvailability(null);
    setBookValid(null);

    const isAvailable = await checkAvailability(book.id);
    setBookValid(isAvailable);
  };

  // Create reservation
  const handleCreateReservation = async () => {
    if (!selectedReader || !selectedBook) return;

    setCreating(true);
    setValidationError(null);

    try {
      const response = await fetch("/api/reservations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_id: selectedReader.cardId,
          book_title_id: selectedBook.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const rpc = result.data;
        if (rpc && typeof rpc === "object") {
          const mode = (rpc.mode || "").toString().toLowerCase();
          if (mode === "hold") {
            const expires = rpc.expires_at ?? rpc.expiresAt ?? rpc.expires ?? null;
            if (expires) {
              let expiresText = "";
              try {
                expiresText = new Date(expires).toLocaleString("vi-VN");
              } catch (e) {
                expiresText = String(expires);
              }
              toast({
                title: "Đặt trước thành công",
                description: `Đã giữ 1 bản cho ${selectedReader.name}. Hết hạn: ${expiresText}`,
              });
            } else {
              console.warn("allocate_reservation_hold returned hold without expires_at", rpc);
              toast({ title: "Đặt trước thành công", description: `Đã giữ 1 bản cho ${selectedReader.name}.` });
            }
          } else if (mode === "queue") {
            const pos = rpc.queue_position ?? rpc.queuePosition ?? rpc.position ?? null;
            if (pos) {
              toast({
                title: "Đặt trước thành công",
                description: `Đã xếp hàng cho ${selectedReader.name}. Vị trí trong hàng chờ: #${pos}`,
              });
            } else {
              console.warn("allocate_reservation_hold returned queue without queue_position", rpc);
              toast({ title: "Đặt trước thành công", description: `Đã xếp hàng cho ${selectedReader.name}.` });
            }
          } else {
            console.warn("allocate_reservation_hold returned unexpected data", rpc);
            toast({ title: "Đặt trước", description: "Đặt trước đã được tạo." });
          }
        } else {
          console.warn("allocate_reservation_hold returned no data", result);
          toast({ title: "Đặt trước", description: "Đặt trước đã được tạo." });
        }

        onReservationCreated();
        handleClose();
      } else {
        setValidationError(result.error || "Không thể tạo đặt trước");
      }
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      setValidationError("Không thể kết nối đến server");
    } finally {
      setCreating(false);
    }
  };

  // Reset dialog
  const handleClose = () => {
    setSelectedReader(null);
    setSelectedBook(null);
    setReaderSearch("");
    setBookSearch("");
    setReaders([]);
    setBooks([]);
    setValidationError(null);
    setAvailability(null);
    setReaderValid(null);
    setBookValid(null);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    fetchReaders();
    fetchBooks();
  }, [open]);

  const filteredReaders = React.useMemo(() => {
    if (!readerSearch) return readers;
    const searchLower = readerSearch.toLowerCase();
    return readers.filter((reader) => {
      const nameLower = reader.name.toLowerCase();
      const cardLower = reader.cardNumber.toLowerCase();
      return (
        nameLower.includes(searchLower) || cardLower.includes(searchLower)
      );
    });
  }, [readers, readerSearch]);

  const filteredBooks = React.useMemo(() => {
    if (!bookSearch) return books;
    const searchLower = normalizeString(bookSearch);
    return books.filter((book) => {
      const titleLower = normalizeString(book.title);
      return titleLower.includes(searchLower);
    });
  }, [books, bookSearch]);

  const canSubmit =
    !!selectedReader &&
    !!selectedBook &&
    readerValid === true &&
    bookValid === true &&
    !validationError &&
    !creating;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo đặt trước sách</DialogTitle>
          <DialogDescription>
            Chọn độc giả và sách để tạo đặt trước.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reader Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Độc giả</Label>
              <Popover open={readerOpen} onOpenChange={setReaderOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={readerOpen}
                    className={cn(
                      "w-full justify-between hover:bg-accent hover:text-accent-foreground",
                      !selectedReader && "text-muted-foreground"
                    )}
                  >
                    {selectedReader ? (
                      <span className="flex items-center gap-2">
                        <span className="font-medium">
                          {selectedReader.name}
                        </span>
                        <span className="text-muted-foreground">—</span>
                        <span>{selectedReader.cardNumber}</span>
                      </span>
                    ) : (
                      "Tìm kiếm độc giả..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Nhập tên hoặc mã thẻ..."
                      value={readerSearch}
                      onValueChange={setReaderSearch}
                    />
                    <CommandList>
                      {readerLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>
                            Không tìm thấy độc giả
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredReaders.map((reader) => (
                              <CommandItem
                                key={reader.id}
                                value={reader.id.toString()}
                                onSelect={() => handleReaderSelect(reader)}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedReader?.id === reader.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-1 items-center justify-between gap-4">
                                  <div className="flex flex-col">
                                    <div className="font-medium">
                                      {reader.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {reader.cardNumber}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

          </div>

          {/* Book Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sách</Label>
              <Popover open={bookOpen} onOpenChange={setBookOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bookOpen}
                    className={cn(
                      "w-full justify-between hover:bg-accent hover:text-accent-foreground",
                      !selectedBook && "text-muted-foreground"
                    )}
                  >
                    {selectedBook ? (
                      <span className="flex items-center gap-2">
                        <span className="font-medium">
                          {selectedBook.title}
                        </span>
                        <span className="text-muted-foreground">—</span>
                        <span>{selectedBook.author}</span>
                      </span>
                    ) : (
                      "Tìm kiếm sách..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Nhập tên sách..."
                      value={bookSearch}
                      onValueChange={setBookSearch}
                    />
                    <CommandList>
                      {bookLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>
                            Không tìm thấy sách
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredBooks.map((book) => (
                              <CommandItem
                                key={book.id}
                                value={book.id.toString()}
                                onSelect={() => handleBookSelect(book)}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedBook?.id === book.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-1 items-center justify-between gap-4">
                                  <div className="flex flex-col">
                                    <div className="font-medium">
                                      {book.title}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {book.author}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {availability && (
              <Alert>
                <AlertDescription className="text-sm text-muted-foreground">
                  {(availability.will_hold_if_available ??
                    (availability.available_copies > 0)) ? (
                    <>
                      Có{" "}
                      {availability.available_copies ??
                        availability.availableCopies ??
                        0}{" "}
                      bản trên kệ. Nếu bạn đặt trước, hệ thống sẽ giữ 1 bản ngay.
                    </>
                  ) : (
                    <>
                      Tất cả các bản đều đang được mượn. Đặt trước sẽ được xếp
                      vào hàng chờ.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Hủy
          </Button>
          <Button
            onClick={handleCreateReservation}
            disabled={!canSubmit}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              "Xác nhận đặt trước"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
