"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  UserIcon,
  CreditCardIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import DarkModeToggle from "./DarkModeToggle";
import UserDropdown from "./UserDropdown";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BellIcon as Bell } from "@heroicons/react/24/solid";
import Link from "next/link";
import { supabaseClient } from "@/lib/client";

const ReaderHeader = ({ user }: { user: any }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [readerId, setReaderId] = useState<number | null>(null);

  const mergeNotifications = (prev: any[], incoming: any[]) => {
    const merged = new Map<number, any>();
    incoming.forEach((n) => merged.set(n.notification_id, n));
    prev.forEach((n) => merged.set(n.notification_id, n));
    return Array.from(merged.values()).sort(
      (a, b) =>
        new Date(b.created_date).getTime() -
        new Date(a.created_date).getTime(),
    );
  };

  useEffect(() => {
    let isMounted = true;
    const resolveReaderId = async () => {
      const supabase = supabaseClient();
      const authUserId = user?.id || (await supabase.auth.getUser()).data?.user?.id;
      if (!authUserId) return;

      const { data, error } = await supabase
        .from("reader")
        .select("reader_id")
        .eq("auth_user_id", authUserId)
        .single();

      if (!error && data?.reader_id && isMounted) {
        setReaderId(data.reader_id);
      }
    };

    resolveReaderId();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!readerId) return;
    const supabase = supabaseClient();
    const channel = supabase
      .channel(`notifications-reader-${readerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification",
          filter: `reader_id=eq.${readerId}`,
        },
        (payload) => {
          const nextNotification = payload.new;
          setNotifications((prev) => [nextNotification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [readerId]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      setLoadingNotifications(true);
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) throw new Error("Failed to load notifications");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNotifications((prev) => mergeNotifications(prev, json.data));
        } else {
          setNotifications([]);
        }
      } catch (e) {
        console.error("Error fetching notifications", e);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    const unread = notifications
      .filter((n: any) => !n.is_read)
      .map((n: any) => n.notification_id);
    if (unread.length === 0) return;

    try {
      const mark = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_ids: unread }),
      });
      if (mark.ok) {
        setNotifications((prev) =>
          prev.map((p) =>
            unread.includes(p.notification_id)
              ? { ...p, is_read: true, read_at: new Date().toISOString() }
              : p,
          ),
        );
      }
    } catch (e) {
      console.error("Failed to mark notifications read", e);
    }
  };

  return (
    <div className="bg-background text-foreground">
      {/* ===== HEADER ===== */}
      <header className="fixed left-0 top-0 z-50 w-full bg-background shadow-md">
        <div className="flex items-center justify-between p-4">
          {/* Logo */}
          <Link href="/reader" className="flex items-center space-x-3">
            <Image
              src="/images/logo/logoKH.jpg"
              alt="Logo Thư viện Khánh Hòa"
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
            <p className="text-xl font-semibold">Thư viện Tỉnh Khánh Hòa</p>
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <DarkModeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-8 w-8" />
              ) : (
                <Bars3Icon className="h-8 w-8" />
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden w-2/3 items-center justify-end space-x-6 lg:flex">
            {/* Auth buttons */}
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
 <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Thông báo"
                    className="relative rounded-full bg-accent p-2 text-accent-foreground transition hover:bg-accent/80"
                  >
                    <Bell className="h-6 w-6" />
                    {notifications.filter((n) => !n.is_read).length > 0 && (
                      <Badge className="absolute -top-1 -right-1">{notifications.filter((n) => !n.is_read).length}</Badge>
                    )}
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <div>
                    {loadingNotifications ? (
                      <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">Không có thông báo mới.</div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <DropdownMenuItem
                          key={n.notification_id}
                          className={`flex flex-col items-start py-2 ${!n.is_read ? "bg-muted/5" : ""}`}
                        >
                          <div className="w-full">
                            <div className={`font-medium truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.message}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_date).toLocaleString("vi-VN")}</div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleMarkAllRead} disabled={notifications.every((n) => n.is_read)}>
                    Đánh dấu đã đọc
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/reader/notifications" className="w-full text-center text-sm">
                      Xem tất cả
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {user ? (
                <UserDropdown />
              ) : (
                <Button asChild variant="outline">
                  <Link href="/login">Đăng nhập</Link>
                </Button>
              )}
            </div>

            {/* Icons */}
            <div className="flex items-center space-x-4">
             
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="flex flex-col items-center space-y-3 pb-4 lg:hidden">
            {[
              {
                icon: <UserIcon className="h-5 w-5 text-primary" />,
                label: "Đăng nhập",
                href: "/login",
              },
              {
                icon: <Bell className="h-5 w-5 text-primary" />,
                label: "Thông báo",
                href: "/reader/notifications",
              },
            ].map(({ icon, label, href }, idx) => (
              <button
                key={idx}
                onClick={() => (location.href = href)}
                className="flex w-11/12 items-center justify-start space-x-3 rounded-lg bg-muted px-4 py-2 transition hover:bg-muted/70"
              >
                {icon}
                <span className="text-base font-medium text-foreground">
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </header>
    </div>
  );
};

export default ReaderHeader;
