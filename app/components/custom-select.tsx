'use client';

import { useState, useRef, useEffect } from 'react';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const buttonClasses =
    variant === 'minimal'
      ? 'w-full flex items-center justify-between gap-2 px-3 py-2 bg-transparent text-sm font-medium text-[#0e121b] hover:bg-gray-50 focus:outline-none rounded-lg transition-all'
      : 'w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-[#d0d7e7] rounded-lg text-sm font-medium text-[#0e121b] hover:border-[var(--primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all';

  return (
    <div ref={dropdownRef} className={`relative ${className}`} id={id}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={buttonClasses}>
        <span>{selectedOption?.label || placeholder}</span>
        <span
          className={`material-symbols-outlined text-[#4d6599] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          style={{ fontSize: 18 }}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#d0d7e7] rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-(--primary)/5 transition-colors flex items-center justify-between ${
                option.value === value
                  ? 'bg-(--primary)/10 text-(--primary) font-medium'
                  : 'text-[#0e121b]'
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <span className="material-symbols-outlined text-(--primary)" style={{ fontSize: 18 }}>
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
