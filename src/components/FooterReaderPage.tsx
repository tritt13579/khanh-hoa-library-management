"use client";
import React from "react";

const FooterReaderPage = () => {
  return (
    <footer className="footer-reader bg-[#1D3A7A] text-white px-6 py-10 text-sm">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Thông tin liên hệ */}
        <div>
          <h3 className="text-lg font-bold mb-4 border-b border-orange-400 inline-block pb-1">
            THÔNG TIN LIÊN HỆ
          </h3>
          <p className="flex items-start space-x-2 mb-2">📍 Số 8 Trần Hưng Đạo, P. Lộc Thọ, TP. Nha Trang</p>
          <p className="flex items-start space-x-2 mb-2">✉️ Email: tvt.svhtt@khanhhoa.gov.vn</p>
          <p className="flex items-start space-x-2 mb-2">📞 Điện thoại: 84.258.3525189</p>
          <p className="mb-2">Chịu trách nhiệm chính: Bà Đinh Thị Ninh Trang - Giám đốc</p>
          <p className="text-blue-300 mb-2">Facebook</p>
          <p className="mb-2">Giấy phép số: 03/GP-STTTT ngày 28/02/2020</p>
          <p className="text-gray-300">© 2020 Thư viện tỉnh Khánh Hòa. All Rights Reserved</p>
        </div>

        {/* Giờ mở cửa */}
        <div>
          <h3 className="text-lg font-bold mb-4 border-b border-orange-400 inline-block pb-1">
            GIỜ MỞ CỬA
          </h3>
          <p>Phòng Đọc, Báo - Tạp chí, Tra cứu: Thứ 2 - Thứ 6</p>
          <p>Phòng Mượn & Thiếu nhi: Thứ 2 - Chủ nhật (nghỉ lễ)</p>
          <p>Buổi sáng: 7h00 - 11h00</p>
          <p>Buổi chiều: 13h30 - 17h00</p>
        </div>

        {/* Thống kê */}
        <div>
          <h3 className="text-lg font-bold mb-4 border-b border-orange-400 inline-block pb-1">
            THỐNG KÊ
          </h3>
          <p>📊 Đang online: 27</p>
          <p>📊 Hôm nay: 946</p>
          <p>📊 Tuần này: 946</p>
          <p>📊 Tháng này: 31,935</p>
          <p>📊 Tổng: 3,233,284</p>
        </div>
      </div>

      {/* Nút scroll top */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="bg-white/20 hover:bg-white/40 border border-white p-2 rounded"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </footer>
  );
};

export default FooterReaderPage;
