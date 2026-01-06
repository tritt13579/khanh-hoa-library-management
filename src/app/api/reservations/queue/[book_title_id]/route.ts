import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/admin";

export async function GET(
  request: Request,
  { params }: { params: { book_title_id: string } }
) {
  const reqId = Math.random().toString(36).slice(2, 8);
  const url = new URL(request.url);

  try {
    const raw = params.book_title_id;
    const bookTitleId = Number(raw);

    console.log(`[queue][${reqId}] GET`, {
      url: url.toString(),
      rawParam: raw,
      parsedBookTitleId: bookTitleId,
      isNaN: Number.isNaN(bookTitleId),
    });

    if (!raw || Number.isNaN(bookTitleId) || bookTitleId <= 0) {
      console.warn(`[queue][${reqId}] invalid param`);
      return NextResponse.json(
        {
          success: false,
          error: "book_title_id must be a positive number",
          debug: { reqId, raw, bookTitleId },
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from("reservation")
      .select(
        `
        reservation_id,
        book_title_id,
        reservation_date,
        reservation_status,
        librarycard:card_id (
          card_id,
          card_number,
          reader:reader_id (
            reader_id,
            first_name,
            last_name
          )
        ),
        reservationqueue (
          queue_id,
          position
        )
      `
      )
      .eq("book_title_id", bookTitleId)
      .in("reservation_status", ["Chờ xử lý", "Sẵn sàng"]);

    if (error) {
      console.error(`[queue][${reqId}] supabase error:`, error);
      throw error;
    }

    const reservations = data ?? [];

    const queueEntries = reservations.map((r: any) => {
      const reader = Array.isArray(r.librarycard?.reader)
        ? r.librarycard.reader[0]
        : r.librarycard?.reader;

      const rq = Array.isArray(r.reservationqueue)
        ? r.reservationqueue[0]
        : r.reservationqueue;

      const status: string = r.reservation_status;

      // "Sẵn sàng" => position null (not in queue)
      const position =
        status === "Sẵn sàng"
          ? null
          : rq?.position !== undefined && rq?.position !== null
            ? Number(rq.position)
            : null;

      return {
        reservation_id: Number(r.reservation_id),
        reader_name:
          `${reader?.last_name || ""} ${reader?.first_name || ""}`.trim() ||
          "Unknown",
        card_number: r.librarycard?.card_number || "Unknown",
        reservation_date: r.reservation_date,
        status,
        position,
        queue_id: rq?.queue_id ?? null,
      };
    });

    queueEntries.sort((a, b) => {
      const aReady = a.status === "Sẵn sàng" ? 0 : 1;
      const bReady = b.status === "Sẵn sàng" ? 0 : 1;
      if (aReady !== bReady) return aReady - bReady;

      const ap = a.position ?? 9999;
      const bp = b.position ?? 9999;
      if (ap !== bp) return ap - bp;

      return (
        new Date(a.reservation_date).getTime() -
        new Date(b.reservation_date).getTime()
      );
    });

    console.log(`[queue][${reqId}] returning`, {
      queueEntriesLen: queueEntries.length,
      readyCount: queueEntries.filter((x) => x.status === "Sẵn sàng").length,
      waitingCount: queueEntries.filter((x) => x.status !== "Sẵn sàng").length,
      first3: queueEntries.slice(0, 3),
    });

    return NextResponse.json({
      success: true,
      data: queueEntries,
      debug: {
        reqId,
        bookTitleId,
        reservationsLen: reservations.length,
      },
    });
  } catch (err: any) {
    console.error(`[queue][${reqId}] ERROR:`, err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch reservation queue",
        debug: { reqId },
      },
      { status: 500 }
    );
  }
}
