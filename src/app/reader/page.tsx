"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CategoryQuickAccess from "@/components/readerpage/CategoryQuickAccess";
import Propagate from "@/components/readerpage/Propagate";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const ReaderHomePage = () => {
  const navItems = [
    { label: "Trang chủ", href: "/" },
    { label: "Giới thiệu", href: "/about" },
    { label: "Thư viện", href: "/library" },
    { label: "Tìm kiếm", href: "/reader/search" },
    { label: "Liên hệ", href: "/contact" },
    { label: "Tin tức", href: "/news" },
  ];

  const sliderImages = [
    "/images/banner/banner4.jpg",
    "/images/banner/banner6.jpeg",
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? sliderImages.length - 1 : prev - 1,
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* ===== BANNER ===== */}
      <section className="pt-20">
        <img
          src="/images/banner/bannerClient.png"
          alt="Banner Thư viện Khánh Hòa"
          className="h-auto w-full object-contain"
        />
      </section>

      {/* ===== NAVBAR ===== */}
      <nav className="bg-background shadow-md">
        <div className="flex flex-wrap items-start justify-between px-4 py-2">
          <div className="flex items-center space-x-2 font-semibold text-gray-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span>Browse Categories</span>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm font-medium text-gray-700 md:justify-start">
            {navItems.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className={`hover:underline ${label === "Trang chủ" ? "font-semibold text-blue-700" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* ===== TUYÊN TRUYỀN + MARQUEE ===== */}
      <Propagate />

      {/* ===== BANNER SECTION 2 ===== */}
      <div className="relative mt-3 h-[350px] w-full overflow-hidden">
        <img
          src="/images/banner/banner1.jpg"
          alt="Banner"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
            <div className="max-w-md space-y-4 text-center text-white md:text-left">
              <h2 className="text-3xl font-bold leading-snug">
                Thư viện thiếu nhi
                <br />
                cho tương lai trẻ em
              </h2>
              <Button
                variant="outline"
                className="rounded-full border-white px-6 py-2 text-gray-400 hover:bg-white hover:text-black"
              >
                Đến ngay →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== THƯ VIỆN + DANH MỤC ===== */}
      <div className="w-full bg-background px-4 py-8 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-x-6 gap-y-6 md:grid-cols-2">
          {/* Thư viện */}
          <div className="text-center md:text-left">
            <h2 className="mb-4 text-2xl font-bold text-primary md:text-3xl">
              THƯ VIỆN TỈNH KHÁNH HÒA
            </h2>
            <div className="relative mx-auto w-full max-w-xl md:mx-0">
              <img
                src="/images/banner/banner2.png"
                alt="Thư viện Tỉnh Khánh Hòa"
                className="h-auto w-full rounded shadow-md"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70 shadow-md transition hover:scale-105">
                  <svg
                    className="h-6 w-6 text-gray-800"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6 4l10 6-10 6V4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Danh mục */}
          <div>
            <CategoryQuickAccess />
          </div>
        </div>
      </div>

      {/* ===== IMAGE SLIDER ===== */}
      <div className="relative mt-2 w-full overflow-hidden">
        <div className="relative h-[400px] w-full">
          <img
            src={sliderImages[currentSlide]}
            alt={`Slide ${currentSlide + 1}`}
            className="h-full w-full object-cover transition-all duration-700"
          />
          {/* Prev Button */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 transform rounded-full bg-white/70 p-2 text-black shadow transition hover:bg-white"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 transform rounded-full bg-white/70 p-2 text-black shadow transition hover:bg-white"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <section className="mb-10 mt-10 rounded-xl bg-gradient-to-r from-blue-100 to-blue-300 px-6 py-12 text-center shadow-inner">
        <h2
          className={`mb-4 text-2xl font-bold text-gray-800 md:text-3xl ${playfair.className}`}
        >
          "Đọc sách là cách bạn trò chuyện với những bộ óc vĩ đại nhất lịch sử."
        </h2>
        <p className="mb-6 text-sm text-gray-700 md:text-base">
          – René Descartes
        </p>
      </section>

      {/* Tailwind animation marquee */}
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-[marquee_30s_linear_infinite] {
            animation: marquee 30s linear infinite;
          }
        `}
      </style>
    </>
  );
};

export default ReaderHomePage;
