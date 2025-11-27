import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const excelFile = formData.get("file") as File | null;

    if (!excelFile) {
      return NextResponse.json({ error: "Chưa có file Excel" }, { status: 400 });
    }

    const arrayBuffer = await excelFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const rows = worksheet.getSheetValues(); // Chỉ số bắt đầu từ 1

    let successCount = 0;
    const failedRows: { rowIndex: number; reason: string }[] = [];

    // Lấy tiêu đề từ dòng 1
    const headerRow = rows[1] as string[];
    if (!headerRow) {
      return NextResponse.json({ error: "Không có dòng tiêu đề" }, { status: 400 });
    }

    // Lặp từ dòng thứ 2 trở đi
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // Map header -> value
      const rowData: Record<string, any> = {};
      for (let j = 1; j < headerRow.length; j++) {
        const key = headerRow[j];
        const value = (row as ExcelJS.CellValue[])[j];
        if (key) rowData[key] = value;
      }

      try {
        const {
          title,
          category_id,
          publisher_id,
          shelf_id,
          publication_year,
          isbn,
          language,
          edition,
          description,
          authors,
          cover_image,
        } = rowData;

        if (!title || !category_id || !publisher_id || !shelf_id || !publication_year || !isbn || !language) {
          failedRows.push({ rowIndex: i, reason: "Thiếu trường bắt buộc" });
          continue;
        }

        const { data: existing } = await supabaseAdmin
          .from("booktitle")
          .select("book_title_id")
          .eq("isbn", isbn)
          .single();

        if (existing?.book_title_id) {
          failedRows.push({ rowIndex: i, reason: "Sách với ISBN này đã tồn tại" });
          continue;
        }

        const { data: insertedBook, error: insertError } = await supabaseAdmin
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
              cover_image: cover_image || null,
            },
          ])
          .select()
          .single();

        if (insertError || !insertedBook) {
          failedRows.push({ rowIndex: i, reason: "Không thể thêm booktitle" });
          continue;
        }

        const book_title_id = insertedBook.book_title_id;

        if (authors) {
          const authorIds = typeof authors === "string"
            ? authors.split(",").map((id: string) => id.trim()).filter(Boolean)
            : [];

          if (authorIds.length > 0) {
            const relations = authorIds.map((author_id: string) => ({
              book_title_id,
              author_id,
            }));

            await supabaseAdmin
              .from("iswrittenby")
              .insert(relations);
          }
        }

        successCount++;
      } catch (err) {
        failedRows.push({ rowIndex: i, reason: "Lỗi không xác định" });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã thêm ${successCount} sách`,
      errors: failedRows,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý file Excel:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
