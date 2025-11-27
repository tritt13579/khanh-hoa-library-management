"use client";

const Propagate = () => {
  return (
    <div className="flex items-center bg-[#0071BC] text-white font-bold px-4 py-2 text-sm uppercase whitespace-nowrap">
      <div className="flex-shrink-0 mr-6">TUYÊN TRUYỀN</div>
      <div className="overflow-hidden flex-1">
        <div
          className="inline-block text-white animate-[marquee_30s_linear_infinite]"
          style={{
            animationName: "marquee",
            animationDuration: "30s",
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        >
          <span className="mx-6">
            Hoạt động hưởng ứng Tuần lễ Quốc gia phòng chống thiên tai năm 2025
          </span>
          <span className="mx-6">•</span>
          <span className="mx-6">
            Tuyên truyền, hưởng ứng Cuộc thi và Triển lãm ảnh nghệ thuật cấp Quốc gia “Tổ quốc bên bờ sóng”
          </span>
          <span className="mx-6">•</span>
          <span className="mx-6">Thông tin mới nhất về các hoạt động của thư viện Khánh Hòa</span>
          <span className="mx-6">•</span>
          <span className="mx-6">
            Tuyên truyền kỷ niệm 50 năm Ngày giải phóng tỉnh Khánh Hòa và 50 năm Ngày giải phóng miền Nam, thống nhất đất nước
          </span>
        </div>
      </div>
    </div>
  );
};

export default Propagate;
