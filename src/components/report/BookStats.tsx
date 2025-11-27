"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabaseClient } from "@/lib/client";

interface BookStats {
  totalTitles: number;
  totalCopies: number;
  categoryStats: Array<{ category_name: string; count: number }>;
  authorStats: Array<{ author_name: string; count: number }>;
  publisherStats: Array<{ publisher_name: string; count: number }>;
  conditionStats: Array<{ condition_name: string; count: number }>;
  availabilityStats: Array<{ availability_status: string; count: number }>;
}

type StatType =
  | "overview"
  | "category"
  | "author"
  | "publisher"
  | "condition"
  | "availability";

export const BookStats = () => {
  const [statType, setStatType] = useState<StatType>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BookStats>({
    totalTitles: 0,
    totalCopies: 0,
    categoryStats: [],
    authorStats: [],
    publisherStats: [],
    conditionStats: [],
    availabilityStats: [],
  });

  const supabase = supabaseClient();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Sử dụng Promise.all để chạy parallel thay vì sequential
      const [
        titleCountResult,
        copyCountResult,
        bookTitlesResult,
        authorsResult,
        bookCopiesResult,
      ] = await Promise.all([
        // Total titles count
        supabase.from("booktitle").select("*", { count: "exact", head: true }),

        // Total copies count
        supabase.from("bookcopy").select("*", { count: "exact", head: true }),

        // Fetch all book titles with category and publisher in one query
        supabase.from("booktitle").select(`
            category:category(category_name),
            publisher:publisher(publisher_name)
          `),

        // Fetch all authors with their books in one query
        supabase.from("iswrittenby").select(`
            author:author(author_name)
          `),

        // Fetch all book copies with condition and availability
        supabase.from("bookcopy").select(`
            condition:condition(condition_name),
            availability_status
          `),
      ]);

      // Process category stats
      const categoryMap = new Map<string, number>();
      bookTitlesResult.data?.forEach((item: any) => {
        const categoryName = item.category?.category_name;
        if (categoryName) {
          categoryMap.set(
            categoryName,
            (categoryMap.get(categoryName) || 0) + 1,
          );
        }
      });

      // Process publisher stats
      const publisherMap = new Map<string, number>();
      bookTitlesResult.data?.forEach((item: any) => {
        const publisherName = item.publisher?.publisher_name;
        if (publisherName) {
          publisherMap.set(
            publisherName,
            (publisherMap.get(publisherName) || 0) + 1,
          );
        }
      });

      // Process author stats
      const authorMap = new Map<string, number>();
      authorsResult.data?.forEach((item: any) => {
        const authorName = item.author?.author_name;
        if (authorName) {
          authorMap.set(authorName, (authorMap.get(authorName) || 0) + 1);
        }
      });

      // Process condition stats
      const conditionMap = new Map<string, number>();
      bookCopiesResult.data?.forEach((item: any) => {
        const conditionName = item.condition?.condition_name;
        if (conditionName) {
          conditionMap.set(
            conditionName,
            (conditionMap.get(conditionName) || 0) + 1,
          );
        }
      });

      // Process availability stats
      const availabilityMap = new Map<string, number>();
      bookCopiesResult.data?.forEach((item: any) => {
        const status = item.availability_status || "Không xác định";
        availabilityMap.set(status, (availabilityMap.get(status) || 0) + 1);
      });

      // Convert Maps to sorted arrays
      const categoryStats = Array.from(categoryMap.entries())
        .map(([category_name, count]) => ({ category_name, count }))
        .sort((a, b) => b.count - a.count);

      const authorStats = Array.from(authorMap.entries())
        .map(([author_name, count]) => ({ author_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Limit to top 20 for performance

      const publisherStats = Array.from(publisherMap.entries())
        .map(([publisher_name, count]) => ({ publisher_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Limit to top 20 for performance

      const conditionStats = Array.from(conditionMap.entries()).map(
        ([condition_name, count]) => ({ condition_name, count }),
      );

      const availabilityStats = Array.from(availabilityMap.entries()).map(
        ([availability_status, count]) => ({ availability_status, count }),
      );

      setStats({
        totalTitles: titleCountResult.count || 0,
        totalCopies: copyCountResult.count || 0,
        categoryStats,
        authorStats,
        publisherStats,
        conditionStats,
        availabilityStats,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Memoize chart data để tránh re-calculate không cần thiết
  const chartData = useMemo(() => {
    const getChartColors = (count: number) => {
      const baseColors = [
        "rgba(59, 130, 246, 0.7)",
        "rgba(16, 185, 129, 0.7)",
        "rgba(245, 158, 11, 0.7)",
        "rgba(239, 68, 68, 0.7)",
        "rgba(139, 92, 246, 0.7)",
        "rgba(236, 72, 153, 0.7)",
        "rgba(34, 197, 94, 0.7)",
        "rgba(168, 85, 247, 0.7)",
        "rgba(249, 115, 22, 0.7)",
        "rgba(20, 184, 166, 0.7)",
      ];

      return Array.from(
        { length: count },
        (_, i) => baseColors[i % baseColors.length],
      );
    };

    switch (statType) {
      case "category":
        return {
          labels: stats.categoryStats.map((item) => item.category_name),
          datasets: [
            {
              data: stats.categoryStats.map((item) => item.count),
              backgroundColor: getChartColors(stats.categoryStats.length),
              borderWidth: 1,
            },
          ],
        };

      case "author":
        const topAuthors = stats.authorStats.slice(0, 10);
        return {
          labels: topAuthors.map((item) => item.author_name),
          datasets: [
            {
              label: "Số lượng sách",
              data: topAuthors.map((item) => item.count),
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 1,
            },
          ],
        };

      case "publisher":
        const topPublishers = stats.publisherStats.slice(0, 10);
        return {
          labels: topPublishers.map((item) => item.publisher_name),
          datasets: [
            {
              label: "Số lượng sách",
              data: topPublishers.map((item) => item.count),
              backgroundColor: "rgba(16, 185, 129, 0.7)",
              borderColor: "rgba(16, 185, 129, 1)",
              borderWidth: 1,
            },
          ],
        };

      case "condition":
        return {
          labels: stats.conditionStats.map((item) => item.condition_name),
          datasets: [
            {
              data: stats.conditionStats.map((item) => item.count),
              backgroundColor: [
                "rgba(16, 185, 129, 0.7)",
                "rgba(245, 158, 11, 0.7)",
                "rgba(239, 68, 68, 0.7)",
              ],
              borderWidth: 1,
            },
          ],
        };

      case "availability":
        return {
          labels: stats.availabilityStats.map(
            (item) => item.availability_status,
          ),
          datasets: [
            {
              data: stats.availabilityStats.map((item) => item.count),
              backgroundColor: [
                "rgba(16, 185, 129, 0.7)",
                "rgba(59, 130, 246, 0.7)",
                "rgba(239, 68, 68, 0.7)",
              ],
              borderWidth: 1,
            },
          ],
        };

      default:
        return null;
    }
  }, [statType, stats]);

  const getStatTitle = useCallback(() => {
    const titles = {
      overview: "Tổng quan",
      category: "Thống kê theo thể loại",
      author: "Thống kê theo tác giả",
      publisher: "Thống kê theo nhà xuất bản",
      condition: "Thống kê theo tình trạng vật lý",
      availability: "Thống kê theo trạng thái sử dụng",
    };
    return titles[statType] || "Thống kê";
  }, [statType]);

  // Memoize chart options
  const chartOptions = useMemo(
    () => ({
      doughnut: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right" as const,
          },
        },
      },
      bar: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: false,
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Thống kê sách</h2>
        <div className="flex gap-4">
          <Select
            value={statType}
            onValueChange={(value) => setStatType(value as StatType)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn loại thống kê" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Tổng quan</SelectItem>
              <SelectItem value="category">Theo thể loại</SelectItem>
              <SelectItem value="author">Theo tác giả</SelectItem>
              <SelectItem value="publisher">Theo nhà xuất bản</SelectItem>
              <SelectItem value="condition">Theo tình trạng vật lý</SelectItem>
              <SelectItem value="availability">
                Theo trạng thái sử dụng
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số đầu sách
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalTitles.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Số lượng đầu sách khác nhau
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số bản sao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalCopies.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng số bản sao sách
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Số thể loại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.categoryStats.length}
            </div>
            <p className="text-xs text-muted-foreground">Thể loại khác nhau</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Số tác giả</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.authorStats.length}
            </div>
            <p className="text-xs text-muted-foreground">Tác giả khác nhau</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      {statType !== "overview" && chartData && (
        <Card>
          <CardHeader>
            <CardTitle>{getStatTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              {statType === "category" ||
              statType === "condition" ||
              statType === "availability" ? (
                <Doughnut data={chartData} options={chartOptions.doughnut} />
              ) : (
                <Bar data={chartData} options={chartOptions.bar} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Stats Tables */}
      {statType === "overview" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 thể loại phổ biến</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.categoryStats.slice(0, 5).map((category, index) => (
                  <div
                    key={category.category_name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">
                      {index + 1}. {category.category_name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {category.count} sách
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Authors */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 tác giả nhiều sách nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.authorStats.slice(0, 5).map((author, index) => (
                  <div
                    key={author.author_name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">
                      {index + 1}. {author.author_name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {author.count} sách
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Condition Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Tình trạng vật lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.conditionStats.map((condition) => (
                  <div
                    key={condition.condition_name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">
                      {condition.condition_name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {condition.count} bản (
                      {stats.totalCopies > 0
                        ? ((condition.count / stats.totalCopies) * 100).toFixed(
                            1,
                          )
                        : "0"}
                      %)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Availability Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái sử dụng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.availabilityStats.map((availability) => (
                  <div
                    key={availability.availability_status}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">
                      {availability.availability_status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {availability.count} bản (
                      {stats.totalCopies > 0
                        ? (
                            (availability.count / stats.totalCopies) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
