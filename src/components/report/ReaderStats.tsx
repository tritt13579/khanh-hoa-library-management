"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
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

// Utility functions
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

const differenceInYears = (dateLeft: Date, dateRight: Date) => {
  const yearDiff = dateLeft.getFullYear() - dateRight.getFullYear();
  const monthDiff = dateLeft.getMonth() - dateRight.getMonth();
  const dayDiff = dateLeft.getDate() - dateRight.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return yearDiff - 1;
  }
  return yearDiff;
};

// Cache để tránh tính lại age group nhiều lần
const ageGroupCache = new Map<string, string>();

export const ReaderStats = () => {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to?: Date;
  }>({
    from: subDays(startOfToday(), 30),
    to: startOfToday(),
  });

  const [viewType, setViewType] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalReaders: number;
    newReaders: number;
    activeReaders: number;
    ageDistribution: { label: string; count: number }[];
    activityStats: {
      period: string;
      newReaders: number;
      activeReaders: number;
    }[];
  }>({
    totalReaders: 0,
    newReaders: 0,
    activeReaders: 0,
    ageDistribution: [],
    activityStats: [],
  });

  const toISO = useCallback((d: Date) => formatDate(d, "yyyy-MM-dd"), []);

  // Tối ưu hàm tính nhóm tuổi với cache
  const getAgeGroup = useCallback((birthDate: string): string => {
    if (ageGroupCache.has(birthDate)) {
      return ageGroupCache.get(birthDate)!;
    }

    const age = differenceInYears(new Date(), new Date(birthDate));
    let ageGroup: string;

    if (age < 18) ageGroup = "16-17";
    else if (age <= 24) ageGroup = "18-24";
    else if (age <= 34) ageGroup = "25-34";
    else if (age <= 44) ageGroup = "35-44";
    else if (age <= 54) ageGroup = "45-54";
    else ageGroup = "55+";

    ageGroupCache.set(birthDate, ageGroup);
    return ageGroup;
  }, []);

  // Fetch activity stats based on viewType and dateRange
  const fetchActivityStats = useCallback(
    async (supabase: any, from: Date, to: Date) => {
      try {
        // Fetch new readers data
        const newReadersResult = await supabase
          .from("librarycard")
          .select("issue_date")
          .gte("issue_date", toISO(from))
          .lte("issue_date", toISO(to));

        // Fetch active readers data
        const activeReadersResult = await supabase
          .from("loantransaction")
          .select("transaction_date, librarycard!inner(reader_id)")
          .gte("transaction_date", toISO(from))
          .lte("transaction_date", toISO(to));

        // Group data by the selected view type
        const activityData: {
          [key: string]: { newReaders: number; activeReaders: Set<number> };
        } = {};

        // Process new readers
        newReadersResult.data?.forEach((card: any) => {
          const date = new Date(card.issue_date);
          let key: string;

          if (viewType === "daily") {
            key = formatDate(date, "yyyy-MM-dd");
          } else if (viewType === "monthly") {
            key = formatDate(date, "MM/yyyy");
          } else {
            key = formatDate(date, "yyyy");
          }

          if (!activityData[key]) {
            activityData[key] = { newReaders: 0, activeReaders: new Set() };
          }
          activityData[key].newReaders++;
        });

        // Process active readers
        activeReadersResult.data?.forEach((transaction: any) => {
          const date = new Date(transaction.transaction_date);
          let key: string;

          if (viewType === "daily") {
            key = formatDate(date, "yyyy-MM-dd");
          } else if (viewType === "monthly") {
            key = formatDate(date, "MM/yyyy");
          } else {
            key = formatDate(date, "yyyy");
          }

          if (!activityData[key]) {
            activityData[key] = { newReaders: 0, activeReaders: new Set() };
          }

          const readerId = Array.isArray(transaction.librarycard)
            ? transaction.librarycard[0]?.reader_id
            : transaction.librarycard?.reader_id;
          if (readerId) {
            activityData[key].activeReaders.add(readerId);
          }
        });

        // Convert to final format and sort
        return Object.entries(activityData)
          .map(([period, data]) => ({
            period,
            newReaders: data.newReaders,
            activeReaders: data.activeReaders.size,
          }))
          .sort((a, b) => a.period.localeCompare(b.period));
      } catch (error) {
        console.error("Error fetching activity stats:", error);
        return [];
      }
    },
    [toISO, viewType],
  );

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const supabase = supabaseClient();

      const from = dateRange.from;
      const to = dateRange.to ?? startOfToday();

      try {
        const [
          totalReadersResult,
          newReadersResult,
          activeReadersResult,
          readersDataResult,
          activityStats,
        ] = await Promise.all([
          // 1. Tổng số độc giả - chỉ count
          supabase.from("reader").select("*", { count: "exact", head: true }),

          // 2. Độc giả mới trong khoảng thời gian được chọn
          supabase
            .from("librarycard")
            .select("*", { count: "exact", head: true })
            .gte("issue_date", toISO(from))
            .lte("issue_date", toISO(to)),

          // 3. Độc giả hoạt động trong khoảng thời gian được chọn
          supabase
            .from("loantransaction")
            .select("librarycard!inner(reader_id)")
            .gte("transaction_date", toISO(from))
            .lte("transaction_date", toISO(to)),

          // 4. Dữ liệu độc giả - chỉ lấy những reader có date_of_birth
          supabase
            .from("reader")
            .select("date_of_birth")
            .not("date_of_birth", "is", null),

          // 5. Activity stats based on viewType and dateRange
          fetchActivityStats(supabase, from, to),
        ]);

        // Xử lý độc giả hoạt động với Set để tối ưu performance
        const activeReaderIds = new Set<number>();
        activeReadersResult.data?.forEach((item: any) => {
          const readerId = Array.isArray(item.librarycard)
            ? item.librarycard[0]?.reader_id
            : item.librarycard?.reader_id;
          if (readerId) activeReaderIds.add(readerId);
        });

        // Xử lý phân bố tuổi với Map để tối ưu
        const ageGroupMap = new Map<string, number>();
        const defaultAgeGroups = [
          "16-17",
          "18-24",
          "25-34",
          "35-44",
          "45-54",
          "55+",
        ];

        // Initialize với 0
        defaultAgeGroups.forEach((group) => ageGroupMap.set(group, 0));

        // Process age data
        readersDataResult.data?.forEach((reader: any) => {
          if (reader.date_of_birth) {
            const ageGroup = getAgeGroup(reader.date_of_birth);
            ageGroupMap.set(ageGroup, (ageGroupMap.get(ageGroup) || 0) + 1);
          }
        });

        const ageDistribution = Array.from(ageGroupMap.entries()).map(
          ([label, count]) => ({
            label,
            count,
          }),
        );

        setStats({
          totalReaders: totalReadersResult.count || 0,
          newReaders: newReadersResult.count || 0,
          activeReaders: activeReaderIds.size,
          ageDistribution,
          activityStats,
        });
      } catch (error) {
        console.error("Error fetching reader stats:", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce để tránh gọi API quá nhiều khi user thay đổi date range hoặc viewType
    const timeoutId = setTimeout(fetchStats, 300);
    return () => clearTimeout(timeoutId);
  }, [
    dateRange.from,
    dateRange.to,
    viewType,
    getAgeGroup,
    fetchActivityStats,
    toISO,
  ]);

  // Memoize chart data với dependency chính xác
  const readerAgeData = useMemo(
    () => ({
      labels: stats.ageDistribution.map((item) => item.label),
      datasets: [
        {
          data: stats.ageDistribution.map((item) => item.count),
          backgroundColor: [
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 99, 132, 0.7)",
            "rgba(255, 205, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
            "rgba(255, 159, 64, 0.7)",
          ],
        },
      ],
    }),
    [stats.ageDistribution],
  );

  const readerActivityData = useMemo(
    () => ({
      labels: stats.activityStats.map((item) => item.period),
      datasets: [
        {
          label: "Độc giả mới",
          data: stats.activityStats.map((item) => item.newReaders),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
        },
        {
          label: "Độc giả hoạt động",
          data: stats.activityStats.map((item) => item.activeReaders),
          backgroundColor: "rgba(255, 99, 132, 0.7)",
        },
      ],
    }),
    [stats.activityStats],
  );

  // Tối ưu chart options với useMemo
  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
        },
      },
    }),
    [],
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return `${context.dataset.label}: ${context.parsed.y}`;
            },
          },
        },
      },
    }),
    [],
  );

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
        <h2 className="text-2xl font-semibold">Thống kê độc giả</h2>
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số độc giả
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalReaders.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Độc giả mới</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {`+${stats.newReaders.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Độc giả hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeReaders.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phân bố độc giả theo độ tuổi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Doughnut data={readerAgeData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Thống kê độc giả theo{" "}
              {viewType === "daily"
                ? "ngày"
                : viewType === "monthly"
                  ? "tháng"
                  : "năm"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar data={readerActivityData} options={barOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
