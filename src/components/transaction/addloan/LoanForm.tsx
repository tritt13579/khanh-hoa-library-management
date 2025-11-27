"use client";

import React from "react";
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
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { LoanFormProps } from "@/interfaces/addLoan";

const LoanForm: React.FC<LoanFormProps> = ({
  form,
  cards,
  loading,
  onOpenChange,
  selectedBooks,
  onSubmit,
  children,
}) => {
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="cursor-pointer hover:ring-2 hover:ring-primary/20 focus:ring-2">
                      <SelectValue placeholder="Chọn thẻ thư viện" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cards.map((card) => (
                      <SelectItem
                        key={card.card_id}
                        value={card.card_id.toString()}
                        className="cursor-pointer transition-colors hover:bg-primary/10 data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20 data-[selected]:font-medium data-[selected]:text-primary"
                      >
                        {card.card_number} - {card.reader.first_name}{" "}
                        {card.reader.last_name} - Số dư:{" "}
                        {card.current_deposit_balance.toLocaleString()}đ
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
