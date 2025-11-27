"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/client";
import {
  BookOpenIcon,
  DocumentTextIcon,
  BeakerIcon,
  AcademicCapIcon,
  UsersIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  PaintBrushIcon,
  MusicalNoteIcon,
  CubeIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  UserIcon,
  FilmIcon,
  GlobeAltIcon,
  FireIcon,
} from "@heroicons/react/24/solid";

const iconMap: Record<string, JSX.Element> = {
  "Tiểu thuyết": <BookOpenIcon className="w-8 h-8 text-[#1E40AF]" />, 
  "Sách thực tế": <DocumentTextIcon className="w-8 h-8 text-[#047857]" />,
  "Khoa học": <BeakerIcon className="w-8 h-8 text-[#7C3AED]" />, 
  "Lịch sử": <AcademicCapIcon className="w-8 h-8 text-[#D97706]" />,
  "Tiểu sử": <UsersIcon className="w-8 h-8 text-[#DC2626]" />, 
  "Phát triển bản thân": <SparklesIcon className="w-8 h-8 text-[#10B981]" />,
  "Triết học": <ChatBubbleLeftRightIcon className="w-8 h-8 text-[#6B7280]" />, 
  "Nghệ thuật": <PaintBrushIcon className="w-8 h-8 text-[#F59E0B]" />, 
  "Thơ ca": <MusicalNoteIcon className="w-8 h-8 text-[#6366F1]" />, 
  "Khoa học viễn tưởng": <CubeIcon className="w-8 h-8 text-[#0EA5E9]" />, 
  "Giả tưởng": <SparklesIcon className="w-8 h-8 text-[#8B5CF6]" />, 
  "Lãng mạn": <HeartIcon className="w-8 h-8 text-[#EC4899]" />,
  "Trinh thám": <MagnifyingGlassIcon className="w-8 h-8 text-[#4B5563]" />, 
  "Kinh dị": <ExclamationTriangleIcon className="w-8 h-8 text-[#B91C1C]" />,
  "Thanh thiếu niên": <UserGroupIcon className="w-8 h-8 text-[#3B82F6]" />,
  "Thiếu nhi": <UserIcon className="w-8 h-8 text-[#F472B6]" />, 
  "Nhà hát": <FilmIcon className="w-8 h-8 text-[#D946EF]" />,
  "Du lịch": <GlobeAltIcon className="w-8 h-8 text-[#14B8A6]" />,
  "Sách nấu ăn": <FireIcon className="w-8 h-8 text-[#EA580C]" />, 
  "Giáo dục": <AcademicCapIcon className="w-8 h-8 text-[#2563EB]" />,
};


type Category = {
  id: number;
  category_name: string;
};

const CategoryQuickAccess = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = supabaseClient();
      const { data, error } = await supabase.from("category").select("*");

      if (error) {
        console.error("Error fetching categories:", error.message);
      } else {
        setCategories(data || []);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6 text-center md:text-left">
        TRUY CẬP NHANH DANH MỤC
      </h2>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-6 text-center text-sm text-primary">
        {categories.slice(0, 20).map((category) => (
          <div
            key={category.id}
            className="flex flex-col items-center space-y-2 hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            {iconMap[category.category_name] ?? (
              <BookOpenIcon className="w-8 h-8 text-[#0071BC]" />
            )}
            <div>{category.category_name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryQuickAccess;
