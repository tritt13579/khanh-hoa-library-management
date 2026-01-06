"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  bookTitleId: string | number;
  bookTitle?: string;
}

const ReserveBookButton: React.FC<Props> = ({ bookTitleId, bookTitle }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleReserve = async () => {
    setLoading(true);
    try {
      const supabase = supabaseClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast({ title: "Yêu cầu đăng nhập", description: "Vui lòng đăng nhập trước khi đặt trước.", variant: "destructive" });
        router.push("/login");
        return;
      }

      const authUserId = userData.user.id;

      // get reader id
      const { data: readerData, error: readerErr } = await supabase
        .from("reader")
        .select("reader_id")
        .eq("auth_user_id", authUserId)
        .single();

      if (readerErr || !readerData) {
        toast({ title: "Lỗi", description: "Không tìm thấy thông tin độc giả.", variant: "destructive" });
        return;
      }

      const { data: cardData, error: cardErr } = await supabase
        .from("librarycard")
        .select("card_id, card_number")
        .eq("reader_id", readerData.reader_id)
        .limit(1)
        .single();

      if (cardErr || !cardData) {
        toast({ title: "Không có thẻ", description: "Bạn chưa có thẻ mượn. Vui lòng liên hệ thư viện.", variant: "destructive" });
        return;
      }

      const body = {
        card_id: cardData.card_id,
        book_title_id: Number(bookTitleId),
      };

      const res = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        toast({ title: "Lỗi", description: result.error || "Không thể tạo đặt trước", variant: "destructive" });
        return;
      }

      const rpc = result.data;
      const mode = (rpc?.mode || "").toString().toLowerCase();
      if (mode === "hold") {
        const expires = rpc.expires_at || rpc.expiresAt || rpc.expires || null;
        toast({ title: "Đặt trước thành công", description: expires ? `Đã giữ 1 bản. Hạn giữ: ${new Date(expires).toLocaleString("vi-VN")}` : "Đã giữ 1 bản." });
      } else if (mode === "queue") {
        const pos = rpc.queue_position || rpc.queuePosition || rpc.position || null;
        toast({ title: "Đặt trước thành công", description: pos ? `Bạn được xếp hàng. Vị trí: #${pos}` : "Bạn đã được xếp hàng." });
      } else {
        toast({ title: "Đặt trước", description: "Đặt trước đã được tạo." });
      }

      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Lỗi", description: err?.message || "Lỗi khi gọi API", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleReserve} disabled={loading}>
      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi...</> : "Đặt sách"}
    </Button>
  );
};

export default ReserveBookButton;
