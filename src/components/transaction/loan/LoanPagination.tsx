"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface LoanPaginationProps {
  currentPage: number;
  totalPages: number;
  paginate: (pageNumber: number) => void;
}

export const LoanPagination: React.FC<LoanPaginationProps> = ({
  currentPage,
  totalPages,
  paginate,
}) => {
  return (
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
  );
};
