'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import CustomSelect from '../components/custom-select';

export default function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const now = new Date();
  const currentMes = searchParams.get('mes') || String(now.getMonth() + 1);
  const currentAño = searchParams.get('año') || String(now.getFullYear());

  const handlePeriodChange = (mes: string, año: string) => {
    router.push(`/reports?mes=${mes}&año=${año}`);
  };

  const meses = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

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
