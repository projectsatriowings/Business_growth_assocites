import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react';

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  disabled?: boolean;
  required?: boolean;
  className?: string;
  isDob?: boolean; // Optimizes year range & quick jumps for Date of Birth
  id?: string;
  name?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'Select date (DD/MM/YYYY)',
  min,
  max,
  disabled = false,
  required = false,
  className = '',
  isDob = false,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date or default view
  const parsedDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : null;
  const currentYear = new Date().getFullYear();

  // For DOB, default browsing year is 2000 (around 24-25 years old) if no value is set
  const defaultYear = isDob ? currentYear - 20 : currentYear;
  const defaultMonth = 0; // January

  const [viewYear, setViewYear] = useState<number>(parsedDate ? parsedDate.getFullYear() : defaultYear);
  const [viewMonth, setViewMonth] = useState<number>(parsedDate ? parsedDate.getMonth() : (isDob ? 0 : new Date().getMonth()));
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Sync internal view when value changes
  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Year range generation
  const startYear = isDob ? currentYear - 90 : currentYear - 30;
  const endYear = isDob ? currentYear - 10 : currentYear + 15;
  const yearsList: number[] = [];
  for (let y = endYear; y >= startYear; y--) {
    yearsList.push(y);
  }

  // Days in current view month
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const selectedIso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange(selectedIso);
    setIsOpen(false);
    setViewMode('days');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleSetToday = () => {
    const today = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(todayIso);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Helper formatting for input display
  const formatDisplay = (val: string): string => {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return '';
    const [y, m, d] = val.split('-');
    const mIndex = parseInt(m, 10) - 1;
    return `${d} ${MONTH_SHORT[mIndex] || m} ${y}`;
  };

  // Check if date is out of min/max bounds
  const isDateDisabled = (year: number, month: number, day: number): boolean => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    if (isDob) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      if (dateStr > todayStr) return true;
    }
    return false;
  };

  const todayStr = (() => {
    const t = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  })();

  return (
    <div className="relative inline-block w-full text-left" ref={containerRef}>
      {/* Trigger Input */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setViewMode('days');
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all select-none cursor-pointer ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-[#0879E8] ring-2 ring-[#DCEBFF] bg-white shadow-xs'
            : 'border-[#D6E2F2] bg-white hover:border-[#0879E8]/60 hover:bg-[#FDFEFF]'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              value ? 'text-[#0879E8]' : 'text-[#60769B]'
            }`}
          />
          {value ? (
            <span className="text-xs font-semibold text-[#10244D] truncate">
              {formatDisplay(value)}
            </span>
          ) : (
            <span className="text-xs font-medium text-[#60769B]/70 truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date"
              className="p-1 rounded-md text-[#60769B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-bold text-[#0879E8] bg-[#DCEBFF]/60 px-1.5 py-0.5 rounded-md">
            {isDob ? 'DOB' : 'Pick'}
          </span>
        </div>
      </div>

      {/* Hidden input to support native form submissions if needed */}
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
      />

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-72 rounded-2xl bg-white border border-[#D6E2F2] shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Month / Year Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F4FA]">
            {/* Quick dropdown selectors */}
            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-lg border border-[#D6E2F2] text-xs font-bold text-[#10244D] bg-white hover:bg-slate-50 focus:outline-none focus:border-[#0879E8] cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown with Fast Birth-Year Jump */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-lg border border-[#D6E2F2] text-xs font-bold text-[#10244D] bg-white hover:bg-slate-50 focus:outline-none focus:border-[#0879E8] cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Prev / Next Month arrows */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1 rounded-lg hover:bg-slate-100 text-[#60769B] hover:text-[#10244D] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1 rounded-lg hover:bg-slate-100 text-[#60769B] hover:text-[#10244D] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-[11px] font-bold text-[#60769B] py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous Month trailing days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const prevDay = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="text-xs text-slate-300 py-1.5 select-none"
                >
                  {prevDay}
                </span>
              );
            })}

            {/* Current Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
              const thisDateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = value === thisDateStr;
              const isToday = thisDateStr === todayStr;
              const disabledDay = isDateDisabled(viewYear, viewMonth, day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => handleSelectDay(day)}
                  className={`text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#0879E8] to-[#123FAD] text-white shadow-xs font-bold'
                      : isToday
                      ? 'border border-[#0879E8] text-[#0879E8] bg-[#F0F7FF] font-bold'
                      : disabledDay
                      ? 'text-slate-200 cursor-not-allowed'
                      : 'text-[#10244D] hover:bg-[#F0F7FF] hover:text-[#0879E8]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F0F4FA] text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-[#60769B] hover:text-rose-600 font-bold transition-colors cursor-pointer"
            >
              Clear
            </button>

            {isDob ? (
              <span className="text-[10px] text-[#60769B] font-medium">
                Pick Month & Year above
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSetToday}
                className="text-[#0879E8] hover:underline font-bold transition-colors cursor-pointer"
              >
                Today
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#10244D] font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
