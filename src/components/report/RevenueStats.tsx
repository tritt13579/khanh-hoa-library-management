"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useState, useEffect, useMemo } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabaseClient } from "@/lib/client";

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

interface PaymentData {
  payment_id: number;
  amount: number;
  payment_date: string;
  reference_type: "librarycard" | "deposittransaction" | "finetransaction";
  payment_method: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export const RevenueStats = () => {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to?: Date;
  }>({
    from: subDays(startOfToday(), 30),
    to: startOfToday(),
  });

  const [viewType, setViewType] = useState("daily");
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = supabaseClient();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment")
        .select(
          "payment_id, amount, payment_date, reference_type, payment_method",
        )
        .gte("payment_date", formatDate(dateRange.from, "yyyy-MM-dd"))
        .lte(
          "payment_date",
          formatDate(dateRange.to || new Date(), "yyyy-MM-dd"),
        )
        .order("payment_date", { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo((): RevenueStats => {
    if (!payments.length) {
      return {
        totalRevenue: 0,
        totalIncome: 0,
        totalExpense: 0,
        transactionCount: 0,
      };
    }

    const totalRevenue = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const totalIncome = payments
      .filter((p) => p.amount > 0)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const totalExpense = Math.abs(
      payments
        .filter((p) => p.amount < 0)
        .reduce((sum, payment) => sum + payment.amount, 0),
    );
    const transactionCount = payments.length;

    return {
      totalRevenue,
      totalIncome,
      totalExpense,
      transactionCount,
    };
  }, [payments]);

  useEffect(() => {
    fetchPayments();
  }, [dateRange]);

  const timeSeriesData = useMemo(() => {
    const groupedData = new Map<string, number>();

    payments.forEach((payment) => {
      let key: string;
      const date = new Date(payment.payment_date);

      if (viewType === "daily") {
        key = formatDate(date, "yyyy-MM-dd");
      } else if (viewType === "monthly") {
        key = formatDate(date, "yyyy-MM");
      } else {
        key = formatDate(date, "yyyy");
      }

      groupedData.set(key, (groupedData.get(key) || 0) + payment.amount);
    });

    const sortedEntries = Array.from(groupedData.entries()).sort();

    return {
      labels: sortedEntries.map(([key]) => key),
      datasets: [
        {
          // label removed per request
          data: sortedEntries.map(([, value]) => value),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
        },
      ],
    };
  }, [payments, viewType]);

  const revenueSourceData = useMemo(() => {
    const sourceData = {
      librarycard: 0,
      deposittransaction: 0,
      finetransaction: 0,
    };

    payments.forEach((payment) => {
      if (payment.reference_type in sourceData) {
        sourceData[payment.reference_type] += Math.abs(payment.amount);
      }
    });

    return {
      labels: ["Phí thẻ thư viện", "Giao dịch đặt cọc", "Phí phạt"],
      datasets: [
        {
          data: [
            sourceData.librarycard,
            sourceData.deposittransaction,
            sourceData.finetransaction,
          ],
          backgroundColor: [
            "rgba(59, 130, 246, 0.7)",
            "rgba(16, 185, 129, 0.7)",
            "rgba(239, 68, 68, 0.7)",
          ],
        },
      ],
    };
  }, [payments]);

  const incomeExpenseData = useMemo(() => {
    const incomeData = new Map<string, number>();
    const expenseData = new Map<string, number>();

    payments.forEach((payment) => {
      let key: string;
      const date = new Date(payment.payment_date);

      if (viewType === "daily") {
        key = formatDate(date, "dd/MM");
      } else if (viewType === "monthly") {
        key = formatDate(date, "MM/yyyy");
      } else {
        key = formatDate(date, "yyyy");
      }

      if (payment.amount > 0) {
        incomeData.set(key, (incomeData.get(key) || 0) + payment.amount);
      } else {
        expenseData.set(
          key,
          (expenseData.get(key) || 0) + Math.abs(payment.amount),
        );
      }
    });

    const allKeys = new Set([...incomeData.keys(), ...expenseData.keys()]);
    const sortedKeys = Array.from(allKeys).sort();

    return {
      labels: sortedKeys,
      datasets: [
        {
          label: "Thu nhập",
          data: sortedKeys.map((key) => incomeData.get(key) || 0),
          backgroundColor: "rgba(16, 185, 129, 0.7)",
        },
        {
          label: "Chi phí",
          data: sortedKeys.map((key) => expenseData.get(key) || 0),
          backgroundColor: "rgba(239, 68, 68, 0.7)",
        },
      ],
    };
  }, [payments, viewType]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Thống kê tài chính</h2>
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

      {/* Key Stats Cards - Optimized Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng thu nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng chi phí</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Số giao dịch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.transactionCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ doanh thu theo thời gian</CardTitle>
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
                  ticks: {
                    callback: (value) => formatCurrency(value as number),
                  },
                },
              },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const y = context.parsed && typeof context.parsed.y === "number" ? context.parsed.y : 0;
                      return formatCurrency(y);
                    },
                  },
                },
                legend: {
                  display: false,
                },
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nguồn doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Pie
                data={revenueSourceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const value = typeof context.parsed === "number" ? context.parsed : 0;
                          const label = context.label || "";
                          return `${label}: ${formatCurrency(value)}`;
                        },
                      },
                    },
                    legend: {
                      position: "bottom",
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thu nhập vs Chi phí</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={incomeExpenseData}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value as number),
                    },
                  },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const y = context.parsed && typeof context.parsed.y === "number" ? context.parsed.y : 0;
                        const dsLabel = context.dataset.label || "";
                        return `${dsLabel}: ${formatCurrency(y)}`;
                      },
                    },
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
