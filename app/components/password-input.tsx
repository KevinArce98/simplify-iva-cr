'use client';

import { useState } from 'react';

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
};

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#0e121b] mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className="w-full px-4 py-3 pr-12 border border-[#d0d7e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent text-[#0e121b]"
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 px-3 text-[#4d6599] cursor-pointer flex items-center hover:text-[#0e121b]"
          disabled={disabled}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <span className="material-symbols-outlined">
            {showPassword ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  );
}
