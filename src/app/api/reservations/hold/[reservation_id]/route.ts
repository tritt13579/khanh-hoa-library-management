import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

export async function GET(request: Request, { params }: { params: { reservation_id: string } }) {
  try {
    const reservationId = parseInt(params.reservation_id);
    if (!reservationId) {
      return NextResponse.json({ success: false, error: "reservation_id is required" }, { status: 400 });
    }

    const supabase = supabaseClient();

    // Fetch holds for this reservation
    const { data: holds, error: holdsError } = await supabase
      .from("reservation_hold")
      .select(
        `hold_id, expires_at, bookcopy:bookcopy!inner(copy_id, book_title_id, price, availability_status, condition:condition_id(condition_name), booktitle:book_title_id(title))`
      )
      .eq("reservation_id", reservationId);

    if (holdsError) throw holdsError;

    // Fetch reservation to get card info
    const { data: reservation, error: reservationError } = await supabase
      .from("reservation")
      .select(`reservation_id, card_id`)
      .eq("reservation_id", reservationId)
      .single();

    if (reservationError) throw reservationError;

    // Fetch card info
    let card = null;
    if (reservation?.card_id) {
      const { data: cardData, error: cardError } = await supabase
        .from("librarycard")
        .select(`card_id, card_number, reader:reader_id(first_name, last_name)`)
        .eq("card_id", reservation.card_id)
        .single();
      if (!cardError) card = cardData;
    }

    // Normalize bookcopy shape
    const processedHolds = (holds || []).map((h: any) => {
      const bc = h.bookcopy || {};
      return {
        hold_id: h.hold_id,
        expires_at: h.expires_at,
        copy_id: bc.copy_id,
        book_title_id: bc.book_title_id,
        price: bc.price,
        availability_status: bc.availability_status,
        condition: bc.condition || { condition_name: "Không xác định" },
        booktitle: bc.booktitle || { title: "Không có tiêu đề" },
      };
    });

    return NextResponse.json({ success: true, data: { holds: processedHolds, card } });
  } catch (error: any) {
    console.error("Error fetching reservation hold:", error);
    return NextResponse.json({ success: false, error: error.message || "Server error" }, { status: 500 });
  }
}
