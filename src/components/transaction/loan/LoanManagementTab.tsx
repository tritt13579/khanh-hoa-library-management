"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FormattedLoanTransaction,
  LoanManagementTabProps,
} from "@/interfaces/library";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { LoanManagementHeader } from "./LoanManagementHeader";
import { LoanFilters } from "./LoanFilters";
import { LoanTable } from "./LoanTable";
import { LoanPagination } from "./LoanPagination";
import { LoanDetailsDialog } from "./LoanDetailsDialog";

const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const compareDates = (a?: string | null, b?: string | null) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
};

const getLatestReturnDate = (loan: FormattedLoanTransaction) => {
  const returnDates = loan.books
    .map((book) => book.returnDate)
    .filter((date): date is string => !!date);
  if (returnDates.length === 0) return null;
  return returnDates.reduce((latest, current) =>
    compareDates(latest, current) < 0 ? current : latest
  );
};

// Sort for urgency: overdue first, then active, then completed with recent activity.
const sortLoanTransactions = (list: FormattedLoanTransaction[]) => {
  const statusPriority: Record<string, number> = {
    "Quá hạn": 1,
    "Đang mượn": 2,
    "Đã trả": 3,
  };

  return [...list].sort((a, b) => {
    const pa = statusPriority[a.status] ?? 99;
    const pb = statusPriority[b.status] ?? 99;

    if (pa !== pb) return pa - pb;

    if (pa === 1 || pa === 2) {
      const due = compareDates(a.dueDate, b.dueDate);
      if (due !== 0) return due;
      const tx = compareDates(a.transactionDate, b.transactionDate);
      if (tx !== 0) return tx;
    }

    if (pa === 3) {
      const returnA = getLatestReturnDate(a);
      const returnB = getLatestReturnDate(b);
      const returned = compareDates(returnB, returnA);
      if (returned !== 0) return returned;
      const tx = compareDates(b.transactionDate, a.transactionDate);
      if (tx !== 0) return tx;
    }

    const nameA = normalizeString(a.reader.name);
    const nameB = normalizeString(b.reader.name);
    if (nameA !== nameB) return nameA.localeCompare(nameB);

    return a.id - b.id;
  });
};

const LoanManagementTab: React.FC<LoanManagementTabProps> = ({
  loanTransactions,
  onLoanCreated,
  onLoanStatusChanged,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBorrowType, setFilterBorrowType] = useState("all");
  const [selectedLoan, setSelectedLoan] =
    useState<FormattedLoanTransaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const normalizedSearchTerm = useMemo(() => {
    return normalizeString(searchTerm);
  }, [searchTerm]);

  const filteredLoans = useMemo(() => {
    return loanTransactions.filter((loan) => {
      if (
        searchTerm === "" &&
        filterStatus === "all" &&
        filterBorrowType === "all"
      ) {
        return true;
      }

      const readerNameMatches = searchTerm
        ? normalizeString(loan.reader.name).includes(normalizedSearchTerm)
        : true;

      const cardNumberMatches = searchTerm
        ? normalizeString(loan.reader.cardNumber).includes(normalizedSearchTerm)
        : true;

      const bookTitleMatches = searchTerm
        ? loan.books.some((book) =>
            normalizeString(book.title).includes(normalizedSearchTerm),
          )
        : true;

      const matchesSearch =
        searchTerm === "" ||
        readerNameMatches ||
        cardNumberMatches ||
        bookTitleMatches;

      const matchesStatusFilter =
        filterStatus === "all" ||
        loan.status.toLowerCase() === filterStatus.toLowerCase();

      const matchesBorrowTypeFilter =
        filterBorrowType === "all" ||
        loan.borrowType.toLowerCase() === filterBorrowType.toLowerCase();

      return matchesSearch && matchesStatusFilter && matchesBorrowTypeFilter;
    });
  }, [loanTransactions, normalizedSearchTerm, filterStatus, filterBorrowType]);

  const sortedLoans = useMemo(() => {
    return sortLoanTransactions(filteredLoans);
  }, [filteredLoans]);

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sortedLoans.slice(indexOfFirstItem, indexOfLastItem);
  }, [sortedLoans, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredLoans.length / itemsPerPage);
  }, [filteredLoans.length, itemsPerPage]);

  const displayInfo = useMemo(() => {
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
    const indexOfLastItem = Math.min(
      currentPage * itemsPerPage,
      filteredLoans.length,
    );
    return { indexOfFirstItem, indexOfLastItem };
  }, [currentPage, itemsPerPage, filteredLoans.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterBorrowType]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleRowClick = (loan: FormattedLoanTransaction): void => {
    setSelectedLoan(loan);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <Card>
      <LoanManagementHeader onLoanCreated={onLoanCreated} />

      <CardContent>
        <LoanFilters
          searchTerm={searchTerm}
          setSearchTerm={handleSearchChange}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterBorrowType={filterBorrowType}
          setFilterBorrowType={setFilterBorrowType}
        />

        <LoanTable
          currentItems={currentItems}
          handleRowClick={handleRowClick}
        />
      </CardContent>

      <CardFooter className="flex justify-between border-t p-4">
        <div className="text-sm text-muted-foreground">
          {filteredLoans.length > 0 ? (
            <>
              Hiển thị {displayInfo.indexOfFirstItem}-
              {displayInfo.indexOfLastItem} trong tổng số {filteredLoans.length}{" "}
              giao dịch
            </>
          ) : (
            <>Không có giao dịch nào phù hợp với điều kiện tìm kiếm</>
          )}
        </div>

        <LoanPagination
          currentPage={currentPage}
          totalPages={totalPages}
          paginate={paginate}
        />
      </CardFooter>

      <LoanDetailsDialog
        selectedLoan={selectedLoan}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        closeDialog={closeDialog}
        onLoanStatusChanged={onLoanStatusChanged}
      />
    </Card>
  );
};

export default LoanManagementTab;
