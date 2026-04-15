'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  id?: string;
  variant?: 'default' | 'minimal';
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  className = '',
  id,
  variant = 'default',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
  }, [onChange]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
      const currentIndex = options.findIndex((o) => o.value === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(Math.min(index + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(Math.max(index - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(options[index].value);
    }
  };

  const buttonClasses =
    variant === 'minimal'
      ? 'w-full flex items-center justify-between gap-2 px-3 py-2 bg-transparent text-sm font-medium text-[#0e121b] hover:bg-gray-50 focus:outline-none rounded-lg transition-all'
      : 'w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-[#d0d7e7] rounded-lg text-sm font-medium text-[#0e121b] hover:border-[var(--primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all';

  const listboxId = id ? `${id}-listbox` : undefined;

  return (
    <div ref={dropdownRef} className={`relative ${className}`} id={id}>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setFocusedIndex(-1); }}
        onKeyDown={handleTriggerKeyDown}
        className={buttonClasses}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span
          className={`material-symbols-outlined text-[#4d6599] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          style={{ fontSize: 18 }}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={placeholder}
          className="absolute z-50 w-full mt-1 bg-white border border-[#d0d7e7] rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(el) => { optionRefs.current[index] = el; }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => handleOptionKeyDown(e, index)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-(--primary)/5 transition-colors flex items-center justify-between ${
                option.value === value
                  ? 'bg-(--primary)/10 text-(--primary) font-medium'
                  : 'text-[#0e121b]'
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <span className="material-symbols-outlined text-(--primary)" style={{ fontSize: 18 }} aria-hidden="true">
                  check
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
