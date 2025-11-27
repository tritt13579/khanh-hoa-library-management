"use client";

import * as React from "react";
import { addDays, format, startOfToday, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerWithRangeProps {
  className?: string;
  value: {
    from: Date;
    to?: Date;
  };
  onChange: (date: DateRange | undefined) => void;
  align?: "start" | "center" | "end";
}

const predefinedRanges = [
  {
    label: "7 ngày qua",
    value: "7days",
    getDate: () => ({
      from: subDays(startOfToday(), 6),
      to: startOfToday(),
    }),
  },
  {
    label: "30 ngày qua",
    value: "30days",
    getDate: () => ({
      from: subDays(startOfToday(), 29),
      to: startOfToday(),
    }),
  },
  {
    label: "Tháng này",
    value: "thisMonth",
    getDate: () => {
      const today = new Date();
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
      };
    },
  },
  {
    label: "Tháng trước",
    value: "lastMonth",
    getDate: () => {
      const today = new Date();
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      };
    },
  },
];

export function DatePickerWithRange({
  className,
  value,
  onChange,
  align = "start",
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>({
    from: value?.from,
    to: value?.to,
  });

  React.useEffect(() => {
    if (!value?.from && !value?.to) {
      const defaultRange = predefinedRanges[1].getDate();
      onChange(defaultRange);
    }
  }, [value, onChange]);

  React.useEffect(() => {
    setTempRange({
      from: value?.from,
      to: value?.to,
    });
  }, [value, isOpen]);

  const handleRangeSelect = (range: string) => {
    const selectedRange = predefinedRanges.find((r) => r.value === range);
    if (selectedRange) {
      setTempRange(selectedRange.getDate());
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setTempRange(range);
  };

  const handleApply = () => {
    if (tempRange?.from) {
      onChange(tempRange);
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    setTempRange({
      from: value?.from,
      to: value?.to,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempRange(undefined);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd/MM/yyyy")} -{" "}
                  {format(value.to, "dd/MM/yyyy")}
                </>
              ) : (
                format(value.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Chọn khoảng thời gian</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="border-b p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">Chọn nhanh</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Select onValueChange={handleRangeSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                {predefinedRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={vi}
            disabled={(date) => date > new Date()}
            className="p-3"
          />

          <div className="flex items-center justify-between gap-2 border-t p-3">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Đóng
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!tempRange?.from}>
              Áp dụng
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
