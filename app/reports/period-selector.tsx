'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import CustomSelect from '../components/custom-select';
import { getMonthName } from '@/lib/utils';

export default function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const currentMes = searchParams.get('mes') || String(now.getMonth() + 1);
  const currentAño = searchParams.get('año') || String(now.getFullYear());

  const handlePeriodChange = (mes: string, año: string) => {
    router.push(`/reports?mes=${mes}&año=${año}`);
  };

  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: getMonthName(i + 1),
  }));

  const años = Array.from({ length: 5 }, (_, i) => ({
    value: String(now.getFullYear() - i),
    label: String(now.getFullYear() - i),
  }));

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="mes" className="text-sm font-medium text-gray-700">
          Mes:
        </label>
        <CustomSelect
          id="mes"
          value={currentMes}
          onChange={(value) => handlePeriodChange(value, currentAño)}
          options={meses}
          className="min-w-35"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="año" className="text-sm font-medium text-gray-700">
          Año:
        </label>
        <CustomSelect
          id="año"
          value={currentAño}
          onChange={(value) => handlePeriodChange(currentMes, value)}
          options={años}
          className="min-w-25"
        />
      </div>
    </div>
  );
}
