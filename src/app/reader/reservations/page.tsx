import NoFooterLayout from "@/components/layout/NoFooterLayout";
import { createClient, getUser } from "@/auth/server";
import React from "react";
import dynamic from "next/dynamic";

const ReservationCard = dynamic(() => import("@/components/reader/ReservationCard"), { ssr: false });

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("vi-VN");
  } catch {
    return dateStr;
  }
}

export default async function ReservationsPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Vui lòng đăng nhập để xem đặt trước.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: readerData } = await supabase
    .from("reader")
    .select("reader_id, first_name, last_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!readerData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Không tìm thấy thông tin độc giả.</p>
      </div>
    );
  }

  const { data: cards } = await supabase
    .from("librarycard")
    .select("card_id")
    .eq("reader_id", readerData.reader_id);

  const cardIds = (cards || []).map((c: any) => c.card_id);

  let reservations: any[] = [];
  if (cardIds.length > 0) {
    const { data: reservationData, error: reservationError } = await supabase
      .from("reservation")
      .select(
        `
        reservation_id,
        reservation_date,
        expiration_date,
        reservation_status,
        booktitle:book_title_id (book_title_id, title),
        reservationqueue:reservationqueue!reservation_id (position)
      `,
      )
      .in("card_id", cardIds)
      .order("reservation_date", { ascending: false });

    if (!reservationError && Array.isArray(reservationData)) {
      reservations = reservationData.map((r: any) => {
        const book = Array.isArray(r.booktitle) ? r.booktitle[0] : r.booktitle;
        const queue = Array.isArray(r.reservationqueue)
          ? r.reservationqueue[0]
          : r.reservationqueue;
        return {
          id: r.reservation_id,
            cardId: r.card_id,
          bookTitle: book?.title || "Unknown",
          reservationDate: r.reservation_date,
          expirationDate: r.expiration_date,
          status: r.reservation_status,
          queuePosition: queue?.position ?? null,
        };
      });
    }
  }

  // Group reservations by status for clearer UX
  const statusOrder = [
    "Sẵn sàng",
    "Chờ xử lý",
    "Đã mượn",
    "Hết hạn",
    "Đã hủy",
  ];

  const grouped: Record<string, any[]> = {
    "Sẵn sàng": [],
    "Chờ xử lý": [],
    "Đã mượn": [],
    "Hết hạn": [],
    "Đã hủy": [],
  };

  reservations.forEach((r) => {
    if (grouped[r.status]) {
      grouped[r.status].push(r);
    }
  });

  return (
    <NoFooterLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Đặt trước của tôi</h1>

        {reservations.length === 0 ? (
          <div className="rounded-md border p-8 text-center">
            <p className="text-lg font-medium">Bạn không có đặt trước nào.</p>
            <p className="text-sm text-muted-foreground mt-2">Tìm sách và đặt trước để nhận khi sách về.</p>
            <div className="mt-4">
              <a href="/reader/search" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95">Tìm sách</a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {statusOrder.map((key) => (
              grouped[key] && grouped[key].length > 0 ? (
                <section key={key}>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{key}</h2>
                    <span className="text-sm text-muted-foreground">{grouped[key].length} mục</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {grouped[key].map((res) => (
                      <ReservationCard
                        key={res.id}
                        id={res.id}
                        bookTitle={res.bookTitle}
                        reservationDate={res.reservationDate}
                        expirationDate={res.expirationDate}
                        status={res.status}
                        queuePosition={res.queuePosition}
                        cardId={res.cardId}
                      />
                    ))}
                  </div>
                </section>
              ) : null
            ))}
          </div>
        )}
      </div>
    </NoFooterLayout>
  );
}
