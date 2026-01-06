"use client";

import React, { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { LoanFormProps } from "@/interfaces/addLoan";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LoanForm: React.FC<LoanFormProps> = ({
  form,
  cards,
  loading,
  onOpenChange,
  selectedBooks,
  onSubmit,
  children,
  readOnlyCardId,
}) => {
  const [cardSearchOpen, setCardSearchOpen] = useState(false);
  const [cardSearchTerm, setCardSearchTerm] = useState("");

  // Filter cards based on search term
  const filteredCards = React.useMemo(() => {
    if (!cardSearchTerm) return cards;
    const searchLower = cardSearchTerm.toLowerCase();
    return cards.filter((card) => {
      const fullName = `${card.reader.first_name} ${card.reader.last_name}`.toLowerCase();
      const cardNumber = card.card_number.toLowerCase();
      return fullName.includes(searchLower) || cardNumber.includes(searchLower);
    });
  }, [cards, cardSearchTerm]);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Library Card Selection */}
          <FormField
            control={form.control}
            name="card_id"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Thẻ thư viện</FormLabel>
                {readOnlyCardId ? (
                  <div className="rounded-md border border-input bg-muted/50 p-3">
                    {cards.find((c) => c.card_id === Number(readOnlyCardId)) ? (
                      <div>
                        <div className="font-medium text-foreground">
                          {cards.find((c) => c.card_id === Number(readOnlyCardId))?.card_number}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {cards.find((c) => c.card_id === Number(readOnlyCardId))?.reader.first_name} {cards.find((c) => c.card_id === Number(readOnlyCardId))?.reader.last_name}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Thẻ: {field.value}</div>
                    )}
                    <input type="hidden" value={field.value} />
                  </div>
                ) : (
                  <Popover open={cardSearchOpen} onOpenChange={setCardSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={cardSearchOpen}
                          className={cn(
                            "w-full justify-between hover:bg-accent hover:text-accent-foreground",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? (() => {
                                const selectedCard = cards.find(
                                  (card) => card.card_id.toString() === field.value
                                );
                                return selectedCard ? (
                                  <span className="flex items-center gap-2">
                                    <span className="font-medium">{selectedCard.card_number}</span>
                                    <span className="text-muted-foreground">—</span>
                                    <span>
                                      {selectedCard.reader.first_name} {selectedCard.reader.last_name}
                                    </span>
                                  </span>
                                ) : (
                                  "Chọn thẻ thư viện"
                                );
                              })()
                            : "Tìm kiếm thẻ thư viện..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Nhập tên hoặc số thẻ..."
                          value={cardSearchTerm}
                          onValueChange={setCardSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {cardSearchTerm.length === 0
                              ? "Nhập để tìm kiếm thẻ thư viện"
                              : "Không tìm thấy thẻ thư viện"}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredCards.map((card) => (
                              <CommandItem
                                key={card.card_id}
                                value={card.card_id.toString()}
                                onSelect={() => {
                                  field.onChange(card.card_id.toString());
                                  setCardSearchOpen(false);
                                  setCardSearchTerm("");
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === card.card_id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-1 items-center justify-between gap-4">
                                  <div className="flex flex-col">
                                    <div className="font-medium">
                                      {card.card_number}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {card.reader.first_name} {card.reader.last_name}
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium text-muted-foreground">
                                    {card.current_deposit_balance.toLocaleString()}đ
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Borrow Type */}
          <FormField
            control={form.control}
            name="borrow_type"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Loại mượn</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="cursor-pointer hover:ring-2 hover:ring-primary/20 focus:ring-2">
                      <SelectValue placeholder="Chọn loại mượn" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem
                      value="Mượn về"
                      className="cursor-pointer transition-colors hover:bg-primary/10 data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20 data-[selected]:font-medium data-[selected]:text-primary"
                    >
                      Mượn về
                    </SelectItem>
                    <SelectItem
                      value="Đọc tại chỗ"
                      className="cursor-pointer transition-colors hover:bg-primary/10 data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20 data-[selected]:font-medium data-[selected]:text-primary"
                    >
                      Đọc tại chỗ
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {children}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={loading || selectedBooks.length === 0}
          >
            {loading ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default LoanForm;
