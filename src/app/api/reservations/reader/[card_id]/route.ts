import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ card_id: string }> }
) {
  try {
    const { card_id } = await params;

    if (!card_id) {
      return NextResponse.json(
        {
          success: false,
          error: "card_id is required",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseClient();

    // Get active reservations for this reader
    const { data: reservations, error: reservationError } = await supabase
      .from("reservation")
      .select(
        `
        reservation_id,
        reservation_date,
        expiration_date,
        reservation_status,
        booktitle:book_title_id (
          book_title_id,
          title
        )
      `
      )
      .eq("card_id", card_id)
      .in("reservation_status", ["Chờ xử lý", "Sẵn sàng"]);

    if (reservationError) throw reservationError;

    const activeCount = reservations?.length || 0;
    const canReserveMore = activeCount < 3;

    // Get book authors for formatting
    const { data: bookAuthorsData, error: bookAuthorsError } = await supabase
      .from("iswrittenby")
      .select(
        `
        book_title_id,
        author:author_id (
          author_name
        )
      `
      );

    if (bookAuthorsError) throw bookAuthorsError;

    // Create author map
    const bookAuthorsMap = new Map<number, string>();
    bookAuthorsData?.forEach((item: any) => {
      const bookId = item.book_title_id;
      const authorObj = Array.isArray(item.author)
        ? item.author[0]
        : item.author;
      const authorName = authorObj?.author_name || "Unknown";

      if (bookAuthorsMap.has(bookId)) {
        bookAuthorsMap.set(
          bookId,
          `${bookAuthorsMap.get(bookId)}, ${authorName}`
        );
      } else {
        bookAuthorsMap.set(bookId, authorName);
      }
    });

    // Format active reservations
    const formattedReservations = reservations?.map((reservation: any) => {
      const bookTitle = Array.isArray(reservation.booktitle)
        ? reservation.booktitle[0]
        : reservation.booktitle;

      return {
        id: reservation.reservation_id,
        bookTitle: bookTitle?.title || "Unknown",
        author:
          bookAuthorsMap.get(bookTitle?.book_title_id!) || "Unknown Author",
        reservationDate: reservation.reservation_date,
        expirationDate: reservation.expiration_date,
        status: reservation.reservation_status,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        card_id: parseInt(card_id),
        active_count: activeCount,
        can_reserve_more: canReserveMore,
        active_reservations: formattedReservations || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching reader reservations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch reader reservations",
      },
      { status: 500 }
    );
  }
}
