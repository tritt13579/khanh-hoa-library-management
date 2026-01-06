"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { supabaseClient } from "@/lib/client";

interface Payment {
  payment_id: number;
  reader_id: number;
  payment_date: string;
  amount: number;
  reference_type: string;
  payment_method: string;
  invoice_no?: string;
  receipt_no?: string;
  reader?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Reader {
  reader_id: number;
  first_name: string;
  last_name: number;
  email: string;
}

interface PaymentStats {
  totalAmount: number;
  totalPayments: number;
  depositTransactions: number;
  fineTransactions: number;
  libraryCardPayments: number;
}

const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const PaymentPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalAmount: 0,
    totalPayments: 0,
    depositTransactions: 0,
    fineTransactions: 0,
    libraryCardPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReferenceType, setSelectedReferenceType] =
    useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const supabase = supabaseClient();

  const normalizedSearchTerm = useMemo(() => {
    return normalizeString(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    fetchPayments();
    fetchReaders();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedReferenceType, selectedPaymentMethod, dateFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment")
        .select(
          `
          *,
          reader:reader_id (
            first_name,
            last_name,
            email
          )
        `,
        )
        .order("payment_id", { ascending: false });

      if (error) throw error;

      setPayments(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReaders = async () => {
    try {
      const { data, error } = await supabase
        .from("reader")
        .select("reader_id, first_name, last_name, email")
        .order("first_name");

      if (error) throw error;
      setReaders(data || []);
    } catch (error) {
      console.error("Error fetching readers:", error);
    }
  };

  const calculateStats = (paymentsData: Payment[]) => {
    const totalAmount = paymentsData.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const totalPayments = paymentsData.length;
    const depositTransactions = paymentsData.filter(
      (p) => p.reference_type === "deposittransaction",
    ).length;
    const fineTransactions = paymentsData.filter(
      (p) => p.reference_type === "finetransaction",
    ).length;
    const libraryCardPayments = paymentsData.filter(
      (p) => p.reference_type === "librarycard",
    ).length;

    setStats({
      totalAmount,
      totalPayments,
      depositTransactions,
      fineTransactions,
      libraryCardPayments,
    });
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Search filter
      const readerNameMatches = searchTerm
        ? normalizeString(
            `${payment.reader?.first_name || ""} ${payment.reader?.last_name || ""}`,
          ).includes(normalizedSearchTerm)
        : true;

      const emailMatches = searchTerm
        ? normalizeString(payment.reader?.email || "").includes(
            normalizedSearchTerm,
          )
        : true;

      const invoiceMatches = searchTerm
        ? normalizeString(payment.invoice_no || "").includes(
            normalizedSearchTerm,
          )
        : true;

      const receiptMatches = searchTerm
        ? normalizeString(payment.receipt_no || "").includes(
            normalizedSearchTerm,
          )
        : true;

      const matchesSearch =
        searchTerm === "" ||
        readerNameMatches ||
        emailMatches ||
        invoiceMatches ||
        receiptMatches;

      // Reference type filter
      const matchesReferenceType =
        selectedReferenceType === "all" ||
        payment.reference_type === selectedReferenceType;

      // Payment method filter
      const matchesPaymentMethod =
        selectedPaymentMethod === "all" ||
        payment.payment_method === selectedPaymentMethod;

      // Date filter
      const matchesDate =
        dateFilter === "all" ||
        (() => {
          const paymentDate = new Date(payment.payment_date);
          const today = new Date();
          const daysDiff =
            (today.getTime() - paymentDate.getTime()) / (1000 * 3600 * 24);

          switch (dateFilter) {
            case "today":
              return daysDiff < 1;
            case "week":
              return daysDiff <= 7;
            case "month":
              return daysDiff <= 30;
            default:
              return true;
          }
        })();

      return (
        matchesSearch &&
        matchesReferenceType &&
        matchesPaymentMethod &&
        matchesDate
      );
    });
  }, [
    payments,
    normalizedSearchTerm,
    selectedReferenceType,
    selectedPaymentMethod,
    dateFilter,
  ]);

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredPayments, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredPayments.length / itemsPerPage);
  }, [filteredPayments.length, itemsPerPage]);

  const displayInfo = useMemo(() => {
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
    const indexOfLastItem = Math.min(
      currentPage * itemsPerPage,
      filteredPayments.length,
    );
    return { indexOfFirstItem, indexOfLastItem };
  }, [currentPage, itemsPerPage, filteredPayments.length]);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: vi });
  };

  const getReferenceTypeLabel = (type: string) => {
    switch (type) {
      case "deposittransaction":
        return "Giao dịch cược trước";
      case "finetransaction":
        return "Thanh toán phạt";
      case "librarycard":
        return "Thẻ thư viện";
      default:
        return type;
    }
  };

  const getReferenceTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "deposittransaction":
        return "default";
      case "finetransaction":
        return "destructive";
      case "librarycard":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "Tiền mặt";
      case "credit_card":
        return "Thẻ tín dụng";
      case "debit_card":
        return "Thẻ ghi nợ";
      case "bank_transfer":
        return "Chuyển khoản";
      default:
        return method;
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý thanh toán</h1>
        </div>
      </div>

      {/* Combined Filters and Table */}
      <Card>
        <CardContent className="pt-4">
          {/* Filters */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex w-full items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, email, số hóa đơn..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select
                value={selectedReferenceType}
                onValueChange={setSelectedReferenceType}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="deposittransaction">Cược trước</SelectItem>
                  <SelectItem value="finetransaction">
                    Thanh toán phạt
                  </SelectItem>
                  <SelectItem value="librarycard">Thẻ thư viện</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
              >
                <SelectTrigger className="w-[180px]">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Phương thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phương thức</SelectItem>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="credit_card">Thẻ tín dụng</SelectItem>
                  <SelectItem value="debit_card">Thẻ ghi nợ</SelectItem>
                  <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ngày thanh toán</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Loại giao dịch</TableHead>
                
                <TableHead>Số hóa đơn</TableHead>
                <TableHead>Số biên lai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((payment) => (
                <TableRow
                  key={payment.payment_id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {payment.reader
                      ? `${payment.reader.first_name} ${payment.reader.last_name}`
                      : "Không rõ"}
                  </TableCell>
                  <TableCell>{payment.reader?.email || "—"}</TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getReferenceTypeBadgeVariant(
                        payment.reference_type,
                      )}
                    >
                      {getReferenceTypeLabel(payment.reference_type)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>{payment.invoice_no || "—"}</TableCell>
                  <TableCell>{payment.receipt_no || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            {filteredPayments.length > 0 ? (
              <>
                Hiển thị {displayInfo.indexOfFirstItem}-
                {displayInfo.indexOfLastItem} trong tổng số{" "}
                {filteredPayments.length} thanh toán
              </>
            ) : (
              <>Không có thanh toán nào phù hợp với điều kiện tìm kiếm</>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Trước
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageToShow;
              if (totalPages <= 5) {
                pageToShow = i + 1;
              } else if (currentPage <= 3) {
                pageToShow = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageToShow = totalPages - 4 + i;
              } else {
                pageToShow = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageToShow}
                  variant={currentPage === pageToShow ? "default" : "outline"}
                  size="sm"
                  onClick={() => paginate(pageToShow)}
                >
                  {pageToShow}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Sau
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentPage;
