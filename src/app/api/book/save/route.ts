import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const coverImageFile = formData.get("coverImageFile") as File | null;

    const bookDataString = formData.get("bookData") as string;
    const bookData = JSON.parse(bookDataString);

    const {
      book_title_id,
      category_id,
      publisher_id,
      shelf_id,
      title,
      publication_year,
      isbn,
      language,
      description,
      edition,
      cover_image,
      authors,
    } = bookData;

    if (
      !title ||
      !category_id ||
      !publisher_id ||
      !shelf_id ||
      !publication_year ||
      !isbn ||
      !language
    ) {
      return NextResponse.json(
        { error: "Thiếu trường bắt buộc" },
        { status: 400 },
      );
    }

    let imageUrl = cover_image;
    if (coverImageFile) {
      const fileExt = coverImageFile.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `book-covers/${fileName}`;

      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from("images")
          .upload(filePath, coverImageFile, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        return NextResponse.json(
          { error: "Tải ảnh lỗi" },
          { status: 500 },
        );
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("images")
        .getPublicUrl(filePath);

      imageUrl = urlData.publicUrl;
    }

    let finalBooktitleId = book_title_id;

    if (book_title_id) {
      const { error: updateError } = await supabaseAdmin
        .from("booktitle")
        .update({
          title,
          category_id,
          publisher_id,
          shelf_id,
          publication_year,
          isbn,
          language,
          edition,
          description,
          cover_image: imageUrl,
        })
        .eq("book_title_id", book_title_id);

      if (updateError) {
        console.error("Error updating book title:", updateError);
        return NextResponse.json(
          { error: "Cập nhật booktitle thất bại" },
          { status: 500 },
        );
      }

      if (authors && authors.length > 0) {
        const { error: deleteAuthorsError } = await supabaseAdmin
          .from("iswrittenby")
          .delete()
          .eq("book_title_id", book_title_id);

        if (deleteAuthorsError) {
          console.error("Error removing existing authors:", deleteAuthorsError);
          return NextResponse.json(
            { error: "Không thể cập nhật tác giả" },
            { status: 500 },
          );
        }

        const authorRelations = authors.map((author: { id: string }) => ({
          book_title_id: book_title_id,
          author_id: author.id,
        }));

        const { error: insertAuthorsError } = await supabaseAdmin
          .from("iswrittenby")
          .insert(authorRelations);

        if (insertAuthorsError) {
          console.error("Error inserting authors:", insertAuthorsError);
          return NextResponse.json(
            { error: "Không thể cập nhật tác giả" },
            { status: 500 },
          );
        }
      }
    } else {
      const { data: existingBook, error: findError } = await supabaseAdmin
        .from("booktitle")
        .select("book_title_id")
        .eq("isbn", isbn)
        .single();

      if (findError && findError.code !== "PGRST116") {
        console.error("Error checking for existing book:", findError);
        return NextResponse.json(
          { error: "Lỗi khi tìm booktitle" },
          { status: 500 },
        );
      }

      if (existingBook?.book_title_id) {
        return NextResponse.json(
          {
            error: "Sách với ISBN này đã tồn tại",
            book_title_id: existingBook.book_title_id,
          },
          { status: 409 },
        );
      }

      const { data: newBooktitle, error: insertError } = await supabaseAdmin
        .from("booktitle")
        .insert([
          {
            title,
            category_id,
            publisher_id,
            shelf_id,
            publication_year,
            isbn,
            language,
            edition,
            description,
            cover_image: imageUrl,
          },
        ])
        .select()
        .single();

      if (insertError || !newBooktitle) {
        console.error("Error creating book title:", insertError);
        return NextResponse.json(
          { error: "Không thể tạo booktitle mới" },
          { status: 500 },
        );
      }

      finalBooktitleId = newBooktitle.book_title_id;

      if (authors && authors.length > 0) {
        const authorRelations = authors.map((author: { id: string }) => ({
          book_title_id: finalBooktitleId,
          author_id: author.id,
        }));

        const { error: insertAuthorsError } = await supabaseAdmin
          .from("iswrittenby")
          .insert(authorRelations);

        if (insertAuthorsError) {
          console.error("Error inserting authors:", insertAuthorsError);
          console.warn("Lỗi liên kết");
        }
      }
    }

    return NextResponse.json({
      success: true,
      book_title_id: finalBooktitleId,
      cover_image: imageUrl,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Đã xảy ra lỗi khi xử lý yêu cầu",
      },
      { status: 500 },
    );
  }
}
