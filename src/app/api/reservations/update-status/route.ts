import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservation_id, new_status } = body;

    if (!reservation_id || !new_status) {
      return NextResponse.json(
        {
          success: false,
          error: "reservation_id and new_status are required",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Get current reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from("reservation")
      .select("*")
      .eq("reservation_id", reservation_id)
      .single();

    if (fetchError) throw fetchError;
    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation not found",
        },
        { status: 404 }
      );
    }

    const currentStatus = reservation.reservation_status;
    let expirationDate = reservation.expiration_date;

    // Handle status transitions
    if (new_status === "Sẵn sàng") {
      // Delegate allocation + hold creation to DB RPC for atomicity.
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "allocate_reservation_hold",
        {
          p_card_id: reservation.card_id,
          p_book_title_id: reservation.book_title_id,
          p_hold_hours: 24,
        }
      );

      if (rpcError) throw rpcError;

      const rpcResult: any = Array.isArray(rpcData) && rpcData.length === 1 ? rpcData[0] : rpcData;
      if (!rpcResult || rpcResult.success === false) {
        return NextResponse.json({ success: false, error: rpcResult?.error || 'allocate_reservation_hold failed' }, { status: 400 });
      }

      // Return successful RPC result to UI
      return NextResponse.json({ success: true, data: rpcResult });
    } else if (
      new_status === "Đã hoàn thành" ||
      new_status === "Đã hủy" ||
      new_status === "Hết hạn"
    ) {
      // Update status
      const { error: updateError } = await supabase
        .from("reservation")
        .update({
          reservation_status: new_status,
        })
        .eq("reservation_id", reservation_id);

      if (updateError) throw updateError;

      // Remove from queue
      const { error: queueDeleteError } = await supabase
        .from("reservationqueue")
        .delete()
        .eq("reservation_id", reservation_id);

      if (queueDeleteError) throw queueDeleteError;

      // Trigger next in queue if book is available and not fulfilled
      if (new_status !== "Đã hoàn thành") {
        await triggerNextInQueue(supabase, reservation.book_title_id);
      }

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật trạng thái thành "${new_status}"`,
      });
    } else {
      // Simple status update
      const { error: updateError } = await supabase
        .from("reservation")
        .update({
          reservation_status: new_status,
        })
        .eq("reservation_id", reservation_id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật trạng thái",
      });
    }
  } catch (error: any) {
    console.error("Error updating reservation status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update reservation status",
      },
      { status: 500 }
    );
  }
}

// Helper function to trigger next reservation in queue
async function triggerNextInQueue(supabase: any, book_title_id: number) {
  try {
    // Check if book is available
    const { data: copies, error: copiesError } = await supabase
      .from("bookcopy")
      .select("copy_id")
      .eq("book_title_id", book_title_id);

    if (copiesError) throw copiesError;

    const { data: loanDetails, error: loanError } = await supabase
      .from("loandetail")
      .select(
        `
        loan_detail_id,
        bookcopy!inner (
          copy_id,
          book_title_id
        )
      `
      )
      .eq("bookcopy.book_title_id", book_title_id)
      .is("return_date", null);

    if (loanError) throw loanError;

    const availableCopies = (copies?.length || 0) - (loanDetails?.length || 0);

    // Only proceed if book is available
    if (availableCopies > 0) {
      // Find next reservation in queue
      const { data: nextReservations, error: nextError } = await supabase
        .from("reservation")
        .select(
          `
          reservation_id,
          reservationqueue:reservationqueue!reservation_id (
            position
          )
        `
        )
        .eq("book_title_id", book_title_id)
        .eq("reservation_status", "Chờ xử lý")
        .order("reservation_date", { ascending: true })
        .limit(1);

      if (nextError) throw nextError;

      if (nextReservations && nextReservations.length > 0) {
        const nextReservation = nextReservations[0];

        // Mark as ready
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);
        // Save full ISO datetime (UTC) so expiration is exact 24 hours later
        const expirationDate = tomorrow.toISOString();

        await supabase
          .from("reservation")
          .update({
            reservation_status: "Sẵn sàng",
            expiration_date: expirationDate,
          })
          .eq("reservation_id", nextReservation.reservation_id);

        // Create notification
        const { data: reservation, error: resError } = await supabase
          .from("reservation")
          .select(
            `
            card_id,
            book_title_id
          `
          )
          .eq("reservation_id", nextReservation.reservation_id)
          .single();

        if (resError) throw resError;

        const { data: cardData, error: cardError } = await supabase
          .from("librarycard")
          .select("reader_id")
          .eq("card_id", reservation.card_id)
          .single();

        if (cardError) throw cardError;

        const { data: bookData, error: bookError } = await supabase
          .from("booktitle")
          .select("title")
          .eq("book_title_id", reservation.book_title_id)
          .single();

        if (bookError) throw bookError;

        const message = `Sách "${bookData.title}" đã sẵn sàng. Vui lòng đến thư viện nhận sách trước ngày ${expirationDate}.`;

        await supabase.from("notification").insert({
          reader_id: cardData.reader_id,
          reservation_id: nextReservation.reservation_id,
          loan_transaction_id: null,
          reference_type: "RESERVATION",
          notification_type: "BOOK_READY",
          message: message,
        });
      }
    }
  } catch (error) {
    console.error("Error triggering next in queue:", error);
    // Don't throw - this is a background operation
  }
}
