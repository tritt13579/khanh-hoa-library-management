import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { supabaseClient } from "@/lib/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const supabase = supabaseClient();

    // Build query
    let query = supabase
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
        ),
        librarycard:card_id (
          card_id,
          card_number,
          reader:reader_id (
            reader_id,
            first_name,
            last_name,
            email
          )
        ),
        reservationqueue:reservationqueue!reservation_id (
          queue_id,
          position
        )
      `
      )
      .order("reservation_date", { ascending: true });

    // Filter by status if provided
    if (status) {
      query = query.eq("reservation_status", status);
    }

    const { data: reservationData, error: reservationError } = await query;

    if (reservationError) throw reservationError;

    // Get book authors
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

    // Count total in queue for each book by taking the max `position` from reservationqueue
    // This avoids counting 'Sẵn sàng' holds as queue members.
    const queueCountMap = new Map<number, number>();

    // map reservation_id -> book_title_id for reservations in the result
    const reservationBookMap = new Map<number, number>();
    reservationData?.forEach((reservation: any) => {
      const bookId = Array.isArray(reservation.booktitle)
        ? reservation.booktitle[0]?.book_title_id
        : reservation.booktitle?.book_title_id;
      if (bookId) reservationBookMap.set(reservation.reservation_id, bookId);
    });

    const reservationIds = Array.from(reservationBookMap.keys());
    if (reservationIds.length > 0) {
      const { data: rqData, error: rqError } = await supabase
        .from("reservationqueue")
        .select("reservation_id, position")
        .in("reservation_id", reservationIds);
      if (rqError) throw rqError;

      rqData?.forEach((rq: any) => {
        const bookId = reservationBookMap.get(rq.reservation_id);
        if (!bookId) return;
        const currentMax = queueCountMap.get(bookId) ?? 0;
        queueCountMap.set(bookId, Math.max(currentMax, rq.position));
      });
    }

    // Format reservations
    const formattedReservations = reservationData?.map((reservation: any) => {
      const reader = Array.isArray(reservation.librarycard?.reader)
        ? reservation.librarycard.reader[0]
        : reservation.librarycard?.reader;

      const bookTitle = Array.isArray(reservation.booktitle)
        ? reservation.booktitle[0]
        : reservation.booktitle;

      const queue = Array.isArray(reservation.reservationqueue)
        ? reservation.reservationqueue[0]
        : reservation.reservationqueue;

      const bookTitleId = bookTitle?.book_title_id;
      const status = reservation.reservation_status;
      const queuePosition = queue?.position ?? undefined;

      return {
        id: reservation.reservation_id,
        bookTitleId: bookTitleId,
        reader: {
          id: reader?.reader_id,
          cardNumber: reservation.librarycard?.card_number || "Unknown",
          name:
            `${reader?.last_name || ""} ${reader?.first_name || ""}`.trim() ||
            "Unknown",
          email: reader?.email || "",
        },
        bookTitle: bookTitle?.title || "Unknown Title",
        author: bookAuthorsMap.get(bookTitleId!) || "Unknown Author",
        reservationDate: reservation.reservation_date,
        expirationDate: reservation.expiration_date,
        status: status,
        queuePosition: queuePosition,
        totalInQueue: queueCountMap.get(bookTitleId!) || 0,
        // Determine action permissions
        canMarkAsReady: status === "Chờ xử lý" && queuePosition === 1,
        canCancel: status === "Chờ xử lý" || status === "Sẵn sàng",
        canMarkAsFulfilled: status === "Sẵn sàng",
        canMarkAsExpired:
          status === "Sẵn sàng" &&
          reservation.expiration_date &&
          new Date(reservation.expiration_date) < new Date(),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedReservations,
    });
  } catch (error: any) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch reservations",
      },
      { status: 500 }
    );
  }
}
