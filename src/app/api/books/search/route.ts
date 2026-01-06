import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { supabaseClient } from "@/lib/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    const supabase = supabaseClient();

    // Search books by title
    let booksQuery = supabase
      .from("booktitle")
      .select(
        `
        book_title_id,
        title,
        isbn
      `
      )
      .limit(20);

    if (query) {
      booksQuery = booksQuery.ilike("title", `%${query}%`);
    } else {
      booksQuery = booksQuery.order("title", { ascending: true });
    }

    const { data: books, error: booksError } = await booksQuery;

    if (booksError) throw booksError;

    // Get authors for these books
    const bookIds = books?.map((book: any) => book.book_title_id) || [];

    if (bookIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { data: authorData, error: authorError } = await supabase
      .from("iswrittenby")
      .select(
        `
        book_title_id,
        author:author_id (
          author_name
        )
      `
      )
      .in("book_title_id", bookIds);

    if (authorError) throw authorError;

    // Create author map
    const authorMap = new Map<number, string>();
    authorData?.forEach((item: any) => {
      const bookId = item.book_title_id;
      const authorObj = Array.isArray(item.author)
        ? item.author[0]
        : item.author;
      const authorName = authorObj?.author_name || "Unknown";

      if (authorMap.has(bookId)) {
        authorMap.set(bookId, `${authorMap.get(bookId)}, ${authorName}`);
      } else {
        authorMap.set(bookId, authorName);
      }
    });

    // Format results
    const formattedBooks = books?.map((book: any) => ({
      id: book.book_title_id,
      title: book.title,
      author: authorMap.get(book.book_title_id) || "Unknown Author",
    }));

    return NextResponse.json({
      success: true,
      data: formattedBooks || [],
    });
  } catch (error: any) {
    console.error("Error searching books:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search books",
      },
      { status: 500 }
    );
  }
}
