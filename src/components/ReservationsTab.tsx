"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ExtendedFormattedReservation } from "@/interfaces/library";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  Users,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { CreateReservationDialog } from "./CreateReservationDialog";
import AddLoanDialog from "@/components/transaction/addloan/AddLoanDialog";
import { ReservationQueueDialog } from "./ReservationQueueDialog";

interface ReservationsTabProps {
  reservations: ExtendedFormattedReservation[];
}

const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

// Compare two date strings (nulls handled). Returns negative if a<b, 0 if equal, positive if a>b
const compareDates = (a?: string | null, b?: string | null) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return ta - tb;
};

// Sort reservations for clearer display: priority by status, then sensible sub-sorting
const sortReservationsList = (
  list: ExtendedFormattedReservation[]
): ExtendedFormattedReservation[] => {
  const statusPriority: Record<string, number> = {
    "Sẵn sàng": 1,
    "Chờ xử lý": 2,
    "Hết hạn": 3,
    "Đã hoàn thành": 4,
    "Đã hủy": 5,
  };

  return [...list].sort((x, y) => {
    const px = statusPriority[x.status] ?? 99;
    const py = statusPriority[y.status] ?? 99;

    if (px !== py) return px - py;

    // Same status: apply status-specific ordering
    // Sẵn sàng: earliest expiration first
    if (px === 1) {
      const d = compareDates(x.expirationDate, y.expirationDate);
      if (d !== 0) return d;
      return x.id - y.id;
    }

    // Chờ xử lý: queue position asc (1 first), then older reservation first
    if (px === 2) {
      const posX = x.queuePosition ?? 99999;
      const posY = y.queuePosition ?? 99999;
      if (posX !== posY) return posX - posY;
      const d = compareDates(x.reservationDate, y.reservationDate);
      if (d !== 0) return d;
      return x.id - y.id;
    }

    // Default: newest reservation first
    const d = compareDates(y.reservationDate, x.reservationDate);
    if (d !== 0) return d;
    return x.id - y.id;
  });
};

const ReservationsTab: React.FC<ReservationsTabProps> = ({
  reservations: initialReservations,
}) => {
  const [reservations, setReservations] = useState<
    ExtendedFormattedReservation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Alert dialog state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertAction, setAlertAction] = useState<{
    type: string;
    reservationId: number;
    readerName: string;
    bookTitle: string;
  } | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Create reservation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Queue dialog state
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [selectedQueueBook, setSelectedQueueBook] = useState<{
    id: number;
    title: string;
    author: string;
  } | null>(null);

  // Add loan dialog state (prefill from reservation)
  const [addLoanOpen, setAddLoanOpen] = useState(false);
  const [initialLoanCardId, setInitialLoanCardId] = useState<number | null>(null);
  const [initialLoanBooks, setInitialLoanBooks] = useState<any[] | null>(null);

  // Processing state for manual actions
  const [checkingExpired, setCheckingExpired] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch reservations
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reservations");
      const result = await response.json();

      if (result.success) {
        setReservations(sortReservationsList(result.data));
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể tải dữ liệu đặt trước",
        });
      }
    } catch (error: any) {
      console.error("Error fetching reservations:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể kết nối đến server",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (initialReservations?.length)
      setReservations(sortReservationsList(initialReservations));

    fetchReservations();
  }, []);


  // Filter and search logic
  const normalizedSearchTerm = useMemo(() => {
    return normalizeString(searchTerm);
  }, [searchTerm]);

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      // Status filter
      const matchesStatus =
        filterStatus === "all" || reservation.status === filterStatus;

      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        normalizeString(reservation.reader.name).includes(
          normalizedSearchTerm
        ) ||
        normalizeString(reservation.reader.cardNumber).includes(
          normalizedSearchTerm
        ) ||
        normalizeString(reservation.bookTitle).includes(normalizedSearchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [reservations, filterStatus, normalizedSearchTerm]);

  // Pagination
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredReservations.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredReservations, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredReservations.length / itemsPerPage);
  }, [filteredReservations.length, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Status badge rendering
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Chờ xử lý":
        return (
          <Badge
            variant="outline"
            className="border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200"
          >
            <Clock className="mr-1 h-3 w-3" />
            Chờ xử lý
          </Badge>
        );
      case "Sẵn sàng":
        return (
          <Badge
            variant="outline"
            className="border-green-100 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-200"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Sẵn sàng
          </Badge>
        );
      case "Đã hoàn thành":
        return (
          <Badge
            variant="outline"
            className="border-gray-100 bg-gray-50 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Đã hoàn thành
          </Badge>
        );
      case "Hết hạn":
        return (
          <Badge
            variant="outline"
            className="border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900 dark:text-orange-200"
          >
            <AlertCircle className="mr-1 h-3 w-3" />
            Hết hạn
          </Badge>
        );
      case "Đã hủy":
        return (
          <Badge
            variant="outline"
            className="border-red-100 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200"
          >
            <XCircle className="mr-1 h-3 w-3" />
            Đã hủy
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground dark:bg-muted/80">
            {status}
          </Badge>
        );
    }
  };

  // Format date (show time when datetime is present)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    // If stored value includes time (ISO datetime), show date + time
    try {
      if (dateString.includes("T")) {
        return new Date(dateString).toLocaleString("vi-VN");
      }
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch (e) {
      return "-";
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (
    type: string,
    reservation: ExtendedFormattedReservation
  ) => {
    setAlertAction({
      type,
      reservationId: reservation.id,
      readerName: reservation.reader.name,
      bookTitle: reservation.bookTitle,
    });
    setAlertOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!alertAction) return;

    setProcessingAction(true);

    try {
      let response;
      if (alertAction.type === "Đã hủy") {
        // Call cancel endpoint with staff_id when available
        response = await fetch("/api/reservations/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservation_id: alertAction.reservationId, staff_id: user?.staff_id }),
        });
      } else {
        response = await fetch("/api/reservations/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservation_id: alertAction.reservationId,
            new_status: alertAction.type,
          }),
        });
      }

      const result = await response.json();

      if (result.success) {
        // If this was a "Sẵn sàng" action, the server returns RPC allocation result in `data`.
        if (alertAction?.type === "Sẵn sàng" && result.data) {
          const rpc = result.data;
          // rpc may include mode: 'hold' or 'queue'
          if (rpc.mode === "hold") {
            toast({ title: "Sẵn sàng — Đã giữ sách", description: `Đã giữ 1 bản. Hết hạn: ${new Date(rpc.expires_at).toLocaleString("vi-VN")}` });
          } else if (rpc.mode === "queue") {
            toast({ title: "Sẵn sàng — Xếp hàng", description: `Đã xếp hàng cho độc giả. Vị trí: #${rpc.queue_position || "?"}` });
          } else {
            toast({ title: "Thành công", description: result.message || "Đã cập nhật trạng thái đặt trước" });
          }
        } else if (alertAction?.type === "Sẵn sàng") {
          // Fallback: server returned success but no RPC data
          toast({ title: "Thành công", description: result.message || "Đã cập nhật trạng thái đặt trước" });
        } else {
          toast({ title: "Thành công", description: result.message || "Đã cập nhật trạng thái đặt trước" });
        }

        await fetchReservations();
      } else {
        toast({ variant: "destructive", title: "Lỗi", description: result.error || "Không thể cập nhật trạng thái" });
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể kết nối đến server",
      });
    } finally {
      setProcessingAction(false);
      setAlertOpen(false);
      setAlertAction(null);
    }
  };

  // Get alert dialog content
  const getAlertContent = () => {
    if (!alertAction) return { title: "", description: "" };

    switch (alertAction.type) {
      case "Sẵn sàng":
        return {
          title: "Đánh dấu sách đã sẵn sàng",
          description: `Bạn có muốn đánh dấu sách "${alertAction.bookTitle}" đã sẵn sàng cho độc giả ${alertAction.readerName}? Hệ thống sẽ tự động gửi thông báo và giữ sách trong 24 giờ.`,
        };
      case "Đã hoàn thành":
        return {
          title: "Xác nhận độc giả đã nhận sách",
          description: `Bạn có xác nhận độc giả ${alertAction.readerName} đã nhận sách "${alertAction.bookTitle}"?`,
        };
      case "Đã hủy":
        return {
          title: "Hủy đặt trước",
          description: `Bạn có chắc muốn hủy đặt trước sách "${alertAction.bookTitle}" của độc giả ${alertAction.readerName}?`,
        };
      case "Hết hạn":
        return {
          title: "Đánh dấu hết hạn",
          description: `Bạn có muốn đánh dấu đặt trước này là hết hạn? Sách sẽ được chuyển cho người tiếp theo trong hàng chờ.`,
        };
      default:
        return { title: "", description: "" };
    }
  };

  const alertContent = getAlertContent();

  // Open queue dialog
  const handleViewQueue = (reservation: ExtendedFormattedReservation) => {
  console.log("[handleViewQueue]", {
    reservation_id: reservation.id,
    bookTitleId: (reservation as any).bookTitleId,
  });

  const bookId = (reservation as any).bookTitleId;
  if (!bookId) {
    toast({
      variant: "destructive",
      title: "Thiếu dữ liệu",
      description: "Reservation thiếu bookTitleId (book_title_id). Hãy sửa API /api/reservations để trả về bookTitleId.",
    });
    return;
  }

  setSelectedQueueBook({
    id: bookId,
    title: reservation.bookTitle,
    author: reservation.author,
  });
  setQueueDialogOpen(true);
};


  // Open Add Loan dialog prefilling card and held copy for this reservation
  const handleOpenLoanDialog = async (reservation: ExtendedFormattedReservation) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reservations/hold/${reservation.id}`);
      const data = await res.json();
      if (data.success) {
        const holds = data.data.holds || [];
        const card = data.data.card || null;
        // Map holds to BookCopy shape expected by AddLoanDialog
        const books = holds.map((h: any) => ({
          copy_id: h.copy_id,
          book_title_id: h.book_title_id,
          price: h.price || 0,
          availability_status: h.availability_status || "Có sẵn",
          booktitle: { title: h.booktitle?.title || reservation.bookTitle },
          condition: { condition_name: h.condition?.condition_name || "Không xác định" },
        }));

        setInitialLoanCardId(card?.card_id || null);
        setInitialLoanBooks(books.length > 0 ? books : null);
        setAddLoanOpen(true);
      } else {
        toast({ variant: "destructive", title: "Lỗi", description: data.error || "Không thể lấy thông tin hold" });
      }
    } catch (error: any) {
      console.error("Error fetching reservation hold:", error);
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể kết nối đến server" });
    } finally {
      setLoading(false);
    }
  };

  // Check for expired reservations
  const handleCheckExpired = async () => {
    setCheckingExpired(true);
    try {
      const response = await fetch("/api/reservations/check-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Hoàn thành",
          description: result.message || `Đã xử lý ${result.expired_count} đặt trước hết hạn`,
        });
        await fetchReservations();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể kiểm tra hết hạn",
        });
      }
    } catch (error: any) {
      console.error("Error checking expired:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể kết nối đến server",
      });
    } finally {
      setCheckingExpired(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header with Create Button */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Danh sách đặt trước</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckExpired}
              disabled={checkingExpired}
            >
              {checkingExpired ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-3 w-3" />
              )}
              Kiểm tra hết hạn
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo đặt trước
            </Button>
          </div>
        </div>
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo tên độc giả, mã thẻ, tên sách..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="Chờ xử lý">Chờ xử lý</SelectItem>
              <SelectItem value="Sẵn sàng">Sẵn sàng</SelectItem>
              <SelectItem value="Đã hoàn thành">Đã hoàn thành</SelectItem>
              <SelectItem value="Hết hạn">Hết hạn</SelectItem>
              <SelectItem value="Đã hủy">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Đang tải dữ liệu...</span>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã ĐT</TableHead>
                  <TableHead>Độc giả</TableHead>
                  <TableHead>Sách</TableHead>
                  <TableHead>Ngày đặt</TableHead>
                  <TableHead className="min-w-[160px]">Trạng thái</TableHead>
                  <TableHead className="min-w-[140px]">Vị trí</TableHead>
                  <TableHead>Hạn giữ</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Không có dữ liệu đặt trước
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        {reservation.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {reservation.reader.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {reservation.reader.cardNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {reservation.bookTitle}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {reservation.author}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(reservation.reservationDate)}
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        {getStatusBadge(reservation.status)}
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        {reservation.queuePosition ? (
                          <Badge variant="secondary">
                            #{reservation.queuePosition} / {reservation.totalInQueue}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(reservation.expirationDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {reservation.canMarkAsExpired && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 hover:bg-orange-50"
                              onClick={() =>
                                openConfirmDialog("Hết hạn", reservation)
                              }
                            >
                              Hết hạn
                            </Button>
                          )}
                          {reservation.canCancel && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() =>
                                openConfirmDialog("Đã hủy", reservation)
                              }
                            >
                              Hủy
                            </Button>
                          )}
                          {reservation.status === "Sẵn sàng" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 hover:bg-purple-50"
                              onClick={() => handleOpenLoanDialog(reservation)}
                            >
                              Mượn
                            </Button>
                          ) : null}
                          {/* Always show View Queue button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-600 hover:bg-gray-50"
                            onClick={() => handleViewQueue(reservation)}
                          >
                            <Users className="mr-1 h-3 w-3" />
                            Hàng chờ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Pagination */}
      <CardFooter className="flex justify-between border-t p-4">
        <div className="text-sm text-muted-foreground">
          {filteredReservations.length > 0 ? (
            <>
              Hiển thị {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredReservations.length)}{" "}
              trong tổng số {filteredReservations.length} đặt trước
            </>
          ) : (
            <>Không có đặt trước nào phù hợp với điều kiện tìm kiếm</>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Trước
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8"
                  >
                    {page}
                  </Button>
                )
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Sau
            </Button>
          </div>
        )}
      </CardFooter>

      {/* Confirmation Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusUpdate}
              disabled={processingAction}
            >
              {processingAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Reservation Dialog */}
      <CreateReservationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onReservationCreated={fetchReservations}
      />

      {/* Queue View Dialog */}
      <ReservationQueueDialog
        open={queueDialogOpen}
        onOpenChange={setQueueDialogOpen}
        bookTitleId={selectedQueueBook?.id || null}
        bookTitle={selectedQueueBook?.title || ""}
        author={selectedQueueBook?.author || ""}
      />

      {/* Add Loan Dialog (prefilled from reservation) */}
      <AddLoanDialog
        open={addLoanOpen}
        onOpenChange={(v) => setAddLoanOpen(v)}
        onLoanCreated={fetchReservations}
        initialCardId={initialLoanCardId}
        initialBooks={initialLoanBooks}
      />
    </Card>
  );
};

export default ReservationsTab;
