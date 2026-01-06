"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, BookOpen, CheckCircle, Clock, XCircle } from "lucide-react";
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
import { Loader2 } from "lucide-react";

type Props = {
  id: string | number;
  bookTitle: string;
  reservationDate?: string | null;
  expirationDate?: string | null;
  status?: string | null;
  queuePosition?: number | null;
  cardId?: string | number | null;
};

export default function ReservationCard({
  id,
  bookTitle,
  reservationDate,
  expirationDate,
  status,
  queuePosition,
  cardId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const formatDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString("vi-VN");
    } catch {
      return d;
    }
  };

  const cancellable = status === "Chờ xử lý" || status === "Sẵn sàng";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const payload: any = { reservation_id: id };
      if (cardId) payload.card_id = cardId;

      const res = await fetch("/api/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Cancel failed");
      }

      toast({ title: "Hủy đặt trước", description: "Hủy đặt trước thành công." });
      router.refresh();
      setConfirmOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Lỗi", description: err?.message || "Có lỗi khi hủy đặt trước." });
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (s?: string | null) => {
    switch (s) {
      case "Sẵn sàng":
        return "border-green-100 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-200";
      case "Đang mượn":
      case "Đã mượn":
        return "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-200";
      case "Hết hạn":
        return "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200";
      case "Đã hủy":
        return "border-red-100 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200";
      case "Chờ xử lý":
        return "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "border-muted bg-muted text-muted-foreground dark:bg-muted/80";
    }
  };

  const getStatusIcon = (s?: string | null) => {
    switch (s) {
      case "Sẵn sàng":
        return <CheckCircle className="h-4 w-4" />;
      case "Chờ xử lý":
        return <Clock className="h-4 w-4" />;
      case "Đang mượn":
      case "Đã mượn":
        return <BookOpen className="h-4 w-4" />;
      case "Hết hạn":
        return <AlertTriangle className="h-4 w-4" />;
      case "Đã hủy":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="rounded-lg border p-4 bg-card shadow-sm flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted/20 text-muted-foreground">
            {getStatusIcon(status)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="font-medium truncate">{bookTitle}</div>
              <div className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(status)}`}>
                {status || "-"}
              </div>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              <div>Ngày đặt: {formatDate(reservationDate)}</div>
              {queuePosition ? <div>Vị trí: #{queuePosition}</div> : null}
              {expirationDate && <div>Hạn giữ: {formatDate(expirationDate)}</div>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={!cancellable || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang hủy...
              </>
            ) : (
              "Hủy"
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy đặt trước</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy đặt trước "{bookTitle}"? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang hủy...
                </>
              ) : (
                "Xác nhận"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
