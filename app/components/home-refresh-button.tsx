'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomeRefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d0d7e7] bg-white px-4 py-2 text-sm font-medium text-[#0e121b] transition-colors hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span
        className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}
        style={{ fontSize: 18 }}
      >
        refresh
      </span>
      <span>{isRefreshing ? 'Actualizando...' : 'Refresh'}</span>
    </button>
  );
}
