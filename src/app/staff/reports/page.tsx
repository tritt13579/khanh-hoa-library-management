"use client";

import { BookStats } from "@/components/report/BookStats";
import { BorrowReturnStats } from "@/components/report/BorrowReturnStats";
import { ReaderStats } from "@/components/report/ReaderStats";
import { RevenueStats } from "@/components/report/RevenueStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, BookOpen, DollarSign, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);

  // Simulating data loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Thêm logic fetch data từ Supabase ở đây
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Giả lập loading
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Báo cáo thống kê</h1>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2">Đang tải dữ liệu...</span>
        </div>
      ) : (
        <Tabs defaultValue="borrow-return" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="borrow-return" className="px-6">
              <BarChart3 className="mr-2 h-4 w-4" />
              Mượn/Trả sách
            </TabsTrigger>
            <TabsTrigger value="readers" className="px-6">
              <Users className="mr-2 h-4 w-4" />
              Độc giả
            </TabsTrigger>
            <TabsTrigger value="books" className="px-6">
              <BookOpen className="mr-2 h-4 w-4" />
              Tình trạng sách
            </TabsTrigger>
          </TabsList>

          <TabsContent value="borrow-return" className="mt-0">
            <BorrowReturnStats />
          </TabsContent>

          <TabsContent value="readers" className="mt-0">
            <ReaderStats />
          </TabsContent>

          <TabsContent value="books" className="mt-0">
            <BookStats />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ReportsPage;
