import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";
import { createClient, getUser } from "@/auth/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservation_id, card_id, staff_id } = body;

    if (!reservation_id) {
      return NextResponse.json({ success: false, error: "reservation_id is required" }, { status: 400 });
    }

    // Fetch reservation
    const { data: reservation, error: resError } = await supabaseAdmin
      .from("reservation")
      .select("reservation_id, card_id, book_title_id, reservation_status")
      .eq("reservation_id", reservation_id)
      .single();

    if (resError || !reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    // Authorization: allow if caller is staff (staff_id) OR card owner.
    // If caller did not provide `card_id`, try to infer from authenticated session (reader).
    if (!staff_id) {
      if (card_id && card_id !== reservation.card_id) {
        return NextResponse.json({ success: false, error: "Forbidden: card_id does not own this reservation" }, { status: 403 });
      }

      // If no card_id provided, try to check session user -> reader -> cards
      if (!card_id) {
        try {
          const serverClient = await createClient();
          const user = await getUser();
          if (!user) {
            return NextResponse.json({ success: false, error: "Authentication required to cancel reservation" }, { status: 401 });
          }

          const { data: readerData, error: readerErr } = await serverClient
            .from("reader")
            .select("reader_id")
            .eq("auth_user_id", user.id)
            .single();

          if (readerErr || !readerData) {
            return NextResponse.json({ success: false, error: "Reader profile not found" }, { status: 403 });
          }

          const { data: cards } = await serverClient
            .from("librarycard")
            .select("card_id")
            .eq("reader_id", readerData.reader_id);

          const cardIds = (cards || []).map((c: any) => c.card_id);
          if (!cardIds.includes(reservation.card_id)) {
            return NextResponse.json({ success: false, error: "Forbidden: not owner of reservation" }, { status: 403 });
          }
        } catch (e) {
          console.error("Error verifying reader session for cancel:", e);
          return NextResponse.json({ success: false, error: "Unable to verify caller" }, { status: 500 });
        }
      }
    }

    // 1. Delete any reservation_hold for this reservation
    const { error: delHoldError } = await supabaseAdmin.from("reservation_hold").delete().eq("reservation_id", reservation_id);
    if (delHoldError) throw delHoldError;

    // 2. If reservation had a queue entry, capture its position so we can shift others
    let deletedQueuePosition: number | null = null;
    try {
      const { data: rqEntry } = await supabaseAdmin
        .from("reservationqueue")
        .select("queue_id, position, reservation_id")
        .eq("reservation_id", reservation_id)
        .limit(1)
        .single();

      if (rqEntry && typeof rqEntry.position === "number") {
        deletedQueuePosition = rqEntry.position;
      }
    } catch (e) {
      // ignore if not found
    }

    const { error: delQueueError } = await supabaseAdmin.from("reservationqueue").delete().eq("reservation_id", reservation_id);
    if (delQueueError) throw delQueueError;

    // 3. If we removed a queued entry, shift positions of later queue members for same book
    if (deletedQueuePosition !== null && reservation.book_title_id) {
      // find reservation_ids for this book that are still in 'Chờ xử lý'
      const { data: pendingRes, error: pendingResError } = await supabaseAdmin
        .from("reservation")
        .select("reservation_id")
        .eq("book_title_id", reservation.book_title_id)
        .eq("reservation_status", "Chờ xử lý");

      if (pendingResError) throw pendingResError;

      const pendingIds = (pendingRes || []).map((r: any) => r.reservation_id).filter(Boolean);

      if (pendingIds.length > 0) {
        const { data: affectedQueues, error: affectedError } = await supabaseAdmin
          .from("reservationqueue")
          .select("queue_id, reservation_id, position")
          .in("reservation_id", pendingIds)
          .gt("position", deletedQueuePosition)
          .order("position", { ascending: true });

        if (affectedError) throw affectedError;

        // decrement each affected position by 1
        for (const q of affectedQueues || []) {
          const newPos = (q.position || 0) - 1;
          const { error: upErr } = await supabaseAdmin
            .from("reservationqueue")
            .update({ position: newPos })
            .eq("queue_id", q.queue_id);
          if (upErr) throw upErr;
        }
      }
    }

    // 3. Update reservation status to 'Đã hủy'
    const { error: updateError } = await supabaseAdmin
      .from("reservation")
      .update({ reservation_status: "Đã hủy", expiration_date: null })
      .eq("reservation_id", reservation_id);

    if (updateError) throw updateError;

    // 4. Trigger next allocation for this book title (if any)
    try {
      if (reservation.book_title_id) {
        await supabaseAdmin.rpc("trigger_next_for_book", { p_book_title_id: reservation.book_title_id, p_hold_hours: 24 });
      }
    } catch (err) {
      console.error("Error triggering next after cancel:", err);
    }

    return NextResponse.json({ success: true, message: "Reservation canceled and hold released" });
  } catch (error: any) {
    console.error("Error cancelling reservation:", error);
    return NextResponse.json({ success: false, error: error.message || "Server error" }, { status: 500 });
  }
}
