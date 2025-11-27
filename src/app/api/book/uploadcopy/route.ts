import { supabaseAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Không có file được tải lên" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    const rows = worksheet.getSheetValues(); // rows[0] = undefined, rows[1] = header

    const errors: { row: number; message: string }[] = [];
    const insertedCopies: any[] = [];

    const headerRow = rows[1] as string[] | undefined;
    if (!headerRow) {
      return NextResponse.json(
        { error: "Không tìm thấy dòng tiêu đề (header) trong file." },
        { status: 400 },
      );
    }

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i] as ExcelJS.CellValue[] | undefined;
      if (!row) continue;

      // Mapping dữ liệu dựa trên header
      const rowData: Record<string, any> = {};
      for (let j = 1; j < headerRow.length; j++) {
        const key = headerRow[j];
        rowData[key] = row[j];
      }

      const {
        book_title_id,
        acquisition_date,
        price,
        condition_id,
      } = rowData;

      if (!book_title_id || !acquisition_date || !price || !condition_id) {
        errors.push({ row: i, message: "Thiếu trường bắt buộc" });
        continue;
      }

      const { data, error } = await supabaseAdmin
        .from("bookcopy")
        .insert([
          {
            book_title_id,
            acquisition_date,
            price,
            condition_id,
            availability_status: "Có sẵn",
          },
        ])
        .select()
        .single();

      if (error) {
        errors.push({ row: i, message: error.message });
        continue;
      }

      insertedCopies.push(data);
    }

    return NextResponse.json({
      success: true,
      message: `${insertedCopies.length} bản sao đã được thêm.`,
      errors,
    });
  } catch (error) {
    console.error("Lỗi hệ thống:", error);
    return NextResponse.json(
      { error: "Lỗi khi xử lý file Excel" },
      { status: 500 },
    );
  }
}
