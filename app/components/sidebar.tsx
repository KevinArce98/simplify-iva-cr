'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const menuItems = [
    {
      href: '/',
      icon: 'dashboard',
      label: 'Panel de Control',
    },
    {
      href: '/upload',
      icon: 'upload_file',
      label: 'Mis Gastos',
    },
    {
      href: '/reports',
      icon: 'bar_chart',
      label: 'Declaraciones',
    },
  ];

  return (
    <div className="hidden md:flex h-full w-64 flex-col justify-between border-r border-[#d0d7e7] bg-white p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col px-2">
          <h1 className="text-[#0e121b] text-lg font-bold leading-normal">
            IVA Calculadora
          </h1>
          <p className="text-[#4d6599] text-sm font-normal leading-normal">
            Costa Rica
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-600'
                    : 'text-[#0e121b] hover:bg-[#f3f4f6]'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                  {item.icon}
                </span>
                <p className="text-sm font-medium leading-normal">{item.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="px-2 pb-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#4d6599] hover:text-blue-600 hover:bg-red-50 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            logout
          </span>
          <p className="text-sm font-medium leading-normal">Cerrar Sesión</p>
        </button>
      </div>
    </div>
  );
}
