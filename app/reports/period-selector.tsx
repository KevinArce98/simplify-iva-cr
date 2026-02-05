'use client';

import { useRouter, useSearchParams } from 'next/navigation';

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

  const años = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="mes" className="text-sm font-medium text-gray-700">
          Mes:
        </label>
        <select
          id="mes"
          value={currentMes}
          onChange={(e) => handlePeriodChange(e.target.value, currentAño)}
          className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
        >
          {meses.map((mes) => (
            <option key={mes.value} value={mes.value}>
              {mes.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="año" className="text-sm font-medium text-gray-700">
          Año:
        </label>
        <select
          id="año"
          value={currentAño}
          onChange={(e) => handlePeriodChange(currentMes, e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
        >
          {años.map((año) => (
            <option key={año} value={año}>
              {año}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
