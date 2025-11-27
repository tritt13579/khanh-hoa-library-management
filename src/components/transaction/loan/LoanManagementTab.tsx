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

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredLoans.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredLoans, currentPage, itemsPerPage]);

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
