import React, { useState, useEffect } from "react"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import * as Popover from "@radix-ui/react-popover"
import { Drawer } from "vaul"
import { cn } from "../../lib/utils"
import "react-day-picker/dist/style.css"

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);
  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }
    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);
    return () => result.removeEventListener("change", onChange);
  }, [query]);
  return value;
}

export type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

interface DatePickerProps {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  className?: string
}

export function DatePickerWithRange({ date, setDate, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handlePresetSelect = (range: DateRange) => {
    setDate(range);
    setOpen(false);
  };

  const today = new Date();
  
  const presets = [
    {
      label: "Hoy",
      action: () => handlePresetSelect({ from: today, to: today })
    },
    {
      label: "Últimos 7 Días",
      action: () => handlePresetSelect({ from: subDays(today, 6), to: today })
    },
    {
      label: "Este Mes",
      action: () => handlePresetSelect({ from: startOfMonth(today), to: endOfMonth(today) })
    },
    {
      label: "Último Mes",
      action: () => {
        const lastMonth = subMonths(today, 1);
        handlePresetSelect({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
      }
    }
  ];

  const TriggerButton = React.forwardRef<HTMLButtonElement, any>((props, ref) => (
    <button
      ref={ref}
      {...props}
      className={cn(
        "w-full md:w-[300px] justify-start text-left font-normal flex items-center h-10 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-sm",
        !date?.from && "text-slate-400",
        className
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
      <span className="truncate">
        {date?.from ? (
          date.to ? (
            <>
              {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
            </>
          ) : (
            format(date.from, "LLL dd, y")
          )
        ) : (
          "Seleccionar fechas..."
        )}
      </span>
    </button>
  ));

  const PresetsMenu = () => (
    <div className="flex flex-col gap-2 min-w-[150px]">
      {presets.map((preset) => (
        <button
          key={preset.label}
          onClick={preset.action}
          className="text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white rounded-md transition-colors"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );

  const CalendarUI = ({ months }: { months: number }) => (
    <>
      <style>{`
        .rdp-root { --rdp-accent-color: #059669; --rdp-background-color: rgba(16,185,129,0.2); margin: 0; max-width: 100%; overflow-x: hidden; }
        .rdp-months { display: flex; flex-direction: ${months === 1 ? 'column' : 'row'}; gap: 1.5rem; width: 100%; }
        
        /* Typography & Layout */
        .rdp-table { max-width: 100%; margin: 0 auto; }
        .rdp-day { width: 2.5rem; height: 2.5rem; font-size: 0.875rem; border-radius: 0.5rem; color: #0f172a; }
        :is(.dark .rdp-day) { color: #cbd5e1; }
        .rdp-head_cell { font-size: 0.75rem; font-weight: 500; color: #64748b; text-transform: uppercase; padding-bottom: 0.5rem; }
        :is(.dark .rdp-head_cell) { color: #94a3b8; }
        
        /* High Contrast Selected States */
        .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { color: white !important; background-color: #4f46e5 !important; font-weight: bold; }
        .rdp-day_range_middle { background-color: rgba(79,70,229,0.1) !important; color: #4f46e5 !important; border-radius: 0; font-weight: 500; }
        :is(.dark .rdp-day_range_middle) { color: white !important; }
        .rdp-day_range_start { background-color: #4f46e5 !important; color: white !important; border-top-right-radius: 0; border-bottom-right-radius: 0; font-weight: bold; }
        .rdp-day_range_end { background-color: #4f46e5 !important; color: white !important; border-top-left-radius: 0; border-bottom-left-radius: 0; font-weight: bold; }
        
        /* Interactions */
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f1f5f9; color: #0f172a; }
        :is(.dark .rdp-button:hover:not([disabled]):not(.rdp-day_selected)) { background-color: #1e293b; color: white; }
        .rdp-day_today:not(.rdp-day_selected) { border: 1px solid #cbd5e1; color: #0f172a; font-weight: bold; }
        :is(.dark .rdp-day_today:not(.rdp-day_selected)) { border: 1px solid #334155; color: white; font-weight: bold; }
      `}</style>
      <DayPicker
        mode="range"
        defaultMonth={date?.from}
        selected={date as any}
        onSelect={setDate as any}
        numberOfMonths={months}
        showOutsideDays={false}
      />
    </>
  );

  if (isDesktop) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <TriggerButton />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content 
            className="z-[9999] w-auto p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] dark:shadow-2xl text-slate-950 dark:text-white mt-2 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 overflow-hidden flex gap-4"
            align="start"
            sideOffset={8}
            avoidCollisions={true}
            collisionPadding={16}
          >
            <div className="border-r border-slate-200 dark:border-slate-800 pr-4">
              <PresetsMenu />
            </div>
            <CalendarUI months={2} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <TriggerButton />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[9999]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[10000] mt-24 flex flex-col rounded-t-[10px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white max-h-[96vh]">
          <div className="p-4 rounded-t-[10px] flex-1 overflow-y-auto w-full flex flex-col gap-6 items-center">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800 mx-auto mb-2 shrink-0" />
            <div className="w-full">
              <PresetsMenu />
            </div>
            <div className="w-full flex justify-center [&_.rdp-month]:w-full [&_.rdp-table]:w-full pb-8">
              <CalendarUI months={1} />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
