'use client';

import { useRouter } from 'next/navigation';
import CustomSelect from './custom-select';
import { getMonthName } from '@/lib/utils';

interface HomePeriodSelectorProps {
  currentMonth: number;
  currentYear: number;
}

export default function HomePeriodSelector({
  currentMonth,
  currentYear,
}: HomePeriodSelectorProps) {
  const router = useRouter();

  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: getMonthName(i + 1),
  }));

  const now = new Date();
  const años = Array.from({ length: 5 }, (_, i) => ({
    value: String(now.getFullYear() - i),
    label: String(now.getFullYear() - i),
  }));

  const handleMonthChange = (month: string) => {
    router.push(`/?mes=${month}&año=${currentYear}`);
  };

  const handleYearChange = (year: string) => {
    router.push(`/?mes=${currentMonth}&año=${year}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-[#d0d7e7]">
      <div className="relative">
        <CustomSelect
          value={String(currentMonth)}
          onChange={handleMonthChange}
          options={meses}
          className="min-w-27.5"
          variant="minimal"
        />
      </div>
      <div className="w-px h-6 bg-[#d0d7e7]"></div>
      <div className="relative">
        <CustomSelect
          value={String(currentYear)}
          onChange={handleYearChange}
          options={años}
          className="min-w-20"
          variant="minimal"
        />
      </div>
    </div>
  );
}
