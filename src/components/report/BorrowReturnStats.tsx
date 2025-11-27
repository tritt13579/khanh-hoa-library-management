"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from "chart.js";
import { DatePickerWithRange } from "../ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabaseClient } from "@/lib/client";
import { Loader2 } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const formatDate = (date: Date, format: string) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  switch (format) {
    case "yyyy-MM-dd":
      return `${year}-${month}-${day}`;
    case "yyyy-MM":
      return `${year}-${month}`;
    case "yyyy":
      return `${year}`;
    case "dd/MM":
      return `${day}/${month}`;
    case "MM/yyyy":
      return `${month}/${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

interface BorrowData {
  transaction_date: string;
}

interface ReturnData {
  return_date: string;
  loantransaction?: {
    due_date: string;
  };
}

interface BorrowReturnStats {
  totalBorrow: number;
  totalReturn: number;
  overdue: number;
  onTimeRate: number;
}

export const BorrowReturnStats = () => {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to?: Date;
  }>({
    from: subDays(startOfToday(), 30),
    to: startOfToday(),
  });

  const [viewType, setViewType] = useState("daily");
  const [borrowData, setBorrowData] = useState<BorrowData[]>([]);
  const [returnData, setReturnData] = useState<ReturnData[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = supabaseClient();

  const fetchData = async () => {
    try {
      setLoading(true);
      const fromDate = formatDate(dateRange.from, "yyyy-MM-dd");
      const toDate = formatDate(dateRange.to || new Date(), "yyyy-MM-dd");

      const [borrowResult, returnResult, overdueResult] = await Promise.all([
        // Fetch borrow data
        supabase
          .from("loantransaction")
          .select("transaction_date")
          .gte("transaction_date", fromDate)
          .lte("transaction_date", toDate)
          .order("transaction_date", { ascending: true }),

        // Fetch return data
        supabase
          .from("loandetail")
          .select(
            `
            return_date,
            loantransaction!inner(due_date)
          `,
          )
          .gte("return_date", fromDate)
          .lte("return_date", toDate)
          .not("return_date", "is", null)
          .order("return_date", { ascending: true }),

        // Fetch overdue count
        supabase
          .from("loantransaction")
          .select("loan_transaction_id", { count: "exact", head: true })
          .eq("loan_status", "Quá hạn"),
      ]);

      if (borrowResult.error) throw borrowResult.error;
      if (returnResult.error) throw returnResult.error;
      if (overdueResult.error) throw overdueResult.error;

      setBorrowData(borrowResult.data || []);
      setReturnData(
        (returnResult.data || []).map((item: any) => ({
          ...item,
          loantransaction: Array.isArray(item.loantransaction)
            ? item.loantransaction[0]
            : item.loantransaction,
        })),
      );
      setOverdueCount(overdueResult.count || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo((): BorrowReturnStats => {
    let onTime = 0;
    let totalReturned = returnData.length;

    returnData.forEach((item) => {
      if (item.return_date && item.loantransaction?.due_date) {
        if (item.return_date <= item.loantransaction.due_date) {
          onTime++;
        }
      }
    });

    const onTimeRate =
      totalReturned === 0
        ? 0
        : Math.round((onTime / totalReturned) * 1000) / 10;

    return {
      totalBorrow: borrowData.length,
      totalReturn: returnData.length,
      overdue: overdueCount,
      onTimeRate,
    };
  }, [borrowData, returnData, overdueCount]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const timeSeriesData = useMemo(() => {
    const borrowGrouped = new Map<string, number>();
    const returnGrouped = new Map<string, number>();

    // Group borrow data
    borrowData.forEach((item) => {
      let key: string;
      const date = new Date(item.transaction_date);

      if (viewType === "daily") {
        key = formatDate(date, "yyyy-MM-dd");
      } else if (viewType === "monthly") {
        key = formatDate(date, "yyyy-MM");
      } else {
        key = formatDate(date, "yyyy");
      }

      borrowGrouped.set(key, (borrowGrouped.get(key) || 0) + 1);
    });

    // Group return data
    returnData.forEach((item) => {
      let key: string;
      const date = new Date(item.return_date);

      if (viewType === "daily") {
        key = formatDate(date, "yyyy-MM-dd");
      } else if (viewType === "monthly") {
        key = formatDate(date, "yyyy-MM");
      } else {
        key = formatDate(date, "yyyy");
      }

      returnGrouped.set(key, (returnGrouped.get(key) || 0) + 1);
    });

    // Combine all keys and sort
    const allKeys = new Set([...borrowGrouped.keys(), ...returnGrouped.keys()]);
    const sortedKeys = Array.from(allKeys).sort();

    return {
      labels: sortedKeys,
      datasets: [
        {
          label: "Số lượt mượn",
          data: sortedKeys.map((key) => borrowGrouped.get(key) || 0),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Số lượt trả",
          data: sortedKeys.map((key) => returnGrouped.get(key) || 0),
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [borrowData, returnData, viewType]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Thống kê mượn/trả sách</h2>
        <div className="flex gap-4">
          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn kiểu xem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Theo ngày</SelectItem>
              <SelectItem value="monthly">Theo tháng</SelectItem>
              <SelectItem value="yearly">Theo năm</SelectItem>
            </SelectContent>
          </Select>
          <DatePickerWithRange
            value={dateRange}
            onChange={(range) => {
              if (range) {
                setDateRange({ from: range.from || new Date(), to: range.to });
              }
            }}
          />
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số lượt mượn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalBorrow}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số lượt trả
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalReturn}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Số sách quá hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.overdue}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tỷ lệ trả đúng hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.onTimeRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Borrow/Return Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ mượn/trả sách theo thời gian</CardTitle>
        </CardHeader>
        <CardContent>
          <Line
            data={timeSeriesData}
            options={{
              responsive: true,
              interaction: {
                intersect: false,
                mode: "index",
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      return `${context.dataset.label}: ${context.parsed.y}`;
                    },
                  },
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
