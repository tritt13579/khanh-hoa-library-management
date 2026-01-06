export interface LibraryCard {
  card_id: number;
  card_number: string;
  card_status: string;
  current_deposit_balance: number;
  reader: {
    first_name: string;
    last_name: string;
  };
}

export interface BookCopy {
  copy_id: number;
  book_title_id: number;
  price: number;
  availability_status: string;
  booktitle: {
    title: string;
  };
  condition: {
    condition_name: string;
  };
}

export interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoanCreated: () => void;
  initialCardId?: number | null;
  initialBooks?: BookCopy[] | null;
}

export interface BookSearchProps {
  availableBooks: BookCopy[];
  selectedBooks: BookCopy[];
  onAddBook: (book: BookCopy) => void;
}

export interface SelectedBooksProps {
  selectedBooks: BookCopy[];
  onRemoveBook: (copyId: number) => void;
  borrowType: string;
  disableRemove?: boolean;
}

export interface LoanFormProps {
  form: any;
  cards: LibraryCard[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedBooks: BookCopy[];
  children: React.ReactNode;
  readOnlyCardId?: number | null;
}
