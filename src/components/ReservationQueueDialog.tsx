"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Users, Clock, CheckCircle } from "lucide-react";
import { QueueEntry } from "@/interfaces/library";

interface ReservationQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookTitleId: number | null;
  bookTitle: string;
  author: string;
}

export const ReservationQueueDialog: React.FC<
  ReservationQueueDialogProps
> = ({ open, onOpenChange, bookTitleId, bookTitle, author }) => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch queue data
  const fetchQueue = async () => {
  if (!bookTitleId) {
    console.warn("[QueueDialog] bookTitleId is null/0 => skip fetch");
    return;
  }

  const url = `/api/reservations/queue/${bookTitleId}`;
  console.log("[QueueDialog] fetching:", { bookTitleId, url });

  try {
    setLoading(true);
    setError(null);

    const res = await fetch(url, { method: "GET" });

    console.log("[QueueDialog] response status:", res.status, res.statusText);

    const text = await res.text(); // đọc raw trước
    console.log("[QueueDialog] raw response:", text);

    let result: any = null;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("[QueueDialog] JSON parse failed:", e);
      setError("API trả về không phải JSON");
      setQueue([]);
      return;
    }

    console.log("[QueueDialog] parsed result:", result);

    if (!res.ok) {
      setError(result?.error || "Không thể tải hàng chờ");
      setQueue([]);
      return;
    }

    if (result?.success) {
      setQueue(Array.isArray(result.data) ? result.data : []);
    } else {
      setError(result?.error || "Không thể tải hàng chờ");
      setQueue([]);
    }
  } catch (e: any) {
    console.error("[QueueDialog] fetch error:", e);
    setError("Không thể kết nối đến server");
    setQueue([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    if (open && bookTitleId) {
      fetchQueue();
    }
  }, [open, bookTitleId]);

  // Format date (timestamptz -> show date + time)
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN");
    } catch {
      return dateString;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Chờ xử lý":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <Clock className="mr-1 h-3 w-3" />
            Chờ xử lý
          </Badge>
        );
      case "Sẵn sàng":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            Sẵn sàng
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Hàng chờ đặt trước
          </DialogTitle>
          <DialogDescription>
            <span className="mt-2 block">
              <span className="font-medium text-foreground">{bookTitle}</span>
              <span className="text-sm block">Tác giả: {author}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Đang tải...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : queue.length === 0 ? (
          <Alert>
            <AlertDescription>
              Hiện không có ai đang đặt trước sách này.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Tổng số: <strong>{queue.length}</strong> người đang chờ
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Vị trí</TableHead>
                    <TableHead>Độc giả</TableHead>
                    <TableHead>Mã thẻ</TableHead>
                    <TableHead>Ngày đặt</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((entry) => (
                    <TableRow key={entry.reservation_id}>
                      <TableCell>
                        <Badge className="font-bold" variant="secondary">
                          #{entry.position}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.reader_name}
                      </TableCell>
                      <TableCell>{entry.card_number}</TableCell>
                      <TableCell>{formatDate(entry.reservation_date)}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {queue.some((e) => e.position === 1 && e.status === "Sẵn sàng") && (
              <Alert className="bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>{queue.find((e) => e.position === 1)?.reader_name}</strong>{" "}
                  đang ở vị trí đầu hàng chờ và sách đã sẵn sàng để nhận.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
