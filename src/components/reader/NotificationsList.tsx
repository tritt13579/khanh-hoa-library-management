"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface NotificationItem {
  notification_id: number;
  message: string;
  created_date: string;
  is_read: boolean;
  notification_type: string;
  reservation_id: number | null;
  loan_transaction_id: number | null;
  read_at?: string | null;
}

interface Props {
  notifications: NotificationItem[];
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("vi-VN");
  } catch {
    return dateStr;
  }
}

function formatType(type: string | null | undefined) {
  if (!type) return "Thông báo";
  const map: Record<string, string> = {
    BOOK_READY: "Sách sẵn sàng",
    RESERVATION_EXPIRED: "Đặt trước hết hạn",
    HOLD_EXPIRING_SOON: "Sắp hết hạn giữ sách",
    BORROW_DUE_SOON: "Sắp đến hạn trả",
    BORROW_OVERDUE: "Quá hạn trả",
  };
  return map[type] || type.replace(/_/g, " ");
}

export default function NotificationsList({ notifications }: Props) {
  const [items, setItems] = useState<NotificationItem[]>(notifications || []);
  const [isMarking, setIsMarking] = useState(false);
  const { toast } = useToast();

  const unreadIds = useMemo(
    () => items.filter((n) => !n.is_read).map((n) => n.notification_id),
    [items],
  );

  const handleMarkAllRead = async () => {
    if (unreadIds.length === 0 || isMarking) return;
    setIsMarking(true);
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to mark notifications read");

      setItems((prev) =>
        prev.map((n) =>
          n.is_read ? n : { ...n, is_read: true, read_at: new Date().toISOString() },
        ),
      );
      toast({ title: "Đã đọc tất cả thông báo", variant: "success" });
    } catch (e) {
      console.error("mark all notifications error", e);
      toast({ title: "Không thể đánh dấu đã đọc", variant: "destructive" });
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Thông báo</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {items.length} mục
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={unreadIds.length === 0 || isMarking}
          >
            {isMarking ? "Đang xử lý..." : "Đọc tất cả"}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-lg font-medium">Bạn chưa có thông báo nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.notification_id}
              className={`rounded-md border p-4 ${
                n.is_read ? "bg-background" : "bg-muted/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{formatType(n.notification_type)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(n.created_date)}
                </div>
              </div>
              <div className="mt-2 text-sm">{n.message}</div>
              {!n.is_read && (
                <div className="mt-3 text-xs text-primary">Chưa đọc</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
