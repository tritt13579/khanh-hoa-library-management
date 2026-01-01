import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    const supabase = supabaseClient();

    // Search readers by name or email, and get their library cards
    let readersQuery = supabase
      .from("reader")
      .select(
        `
        reader_id,
        first_name,
        last_name,
        email,
        librarycard:librarycard!reader_id (
          card_id,
          card_number,
          card_status
        )
      `
      )
      .limit(20);

    if (query) {
      readersQuery = readersQuery.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`
      );
    } else {
      readersQuery = readersQuery.order("last_name", { ascending: true });
    }

    const { data: readers, error: readersError } = await readersQuery;

    if (readersError) throw readersError;

    // Format results: only include readers with active library cards
    const formattedReaders = readers
      ?.map((reader: any) => {
        const cards = Array.isArray(reader.librarycard)
          ? reader.librarycard
          : reader.librarycard
          ? [reader.librarycard]
          : [];

        // Find first active card
        const activeCard = cards.find(
          (card: any) => card.card_status === "Hoạt động"
        );

        if (!activeCard) return null;

        return {
          id: reader.reader_id,
          name: `${reader.last_name} ${reader.first_name}`.trim(),
          cardNumber: activeCard.card_number,
          cardId: activeCard.card_id,
        };
      })
      .filter(Boolean); // Remove null entries

    return NextResponse.json({
      success: true,
      data: formattedReaders || [],
    });
  } catch (error: any) {
    console.error("Error searching readers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search readers",
      },
      { status: 500 }
    );
  }
}
