'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
      label: 'Cargar Comprobantes',
    },
    {
      href: '/reports',
      icon: 'bar_chart',
      label: 'Declaraciones',
    },
    {
      href: '/profile',
      icon: 'person',
      label: 'Perfil',
    },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-white border-b border-[#d0d7e7] z-50">
        <div className="flex flex-col">
          <h1 className="text-[#0e121b] text-base font-bold">Simplify IVA CR</h1>
          <p className="text-[#4d6599] text-xs font-normal">Costa Rica</p>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-[#0e121b] p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Menú"
        >
          <span className="material-symbols-outlined">
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 top-18.25"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`md:hidden fixed top-18.25 right-0 h-[calc(100vh-73px)] w-64 bg-white border-l border-[#d0d7e7] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col justify-between h-full p-4">
          <div className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-(--primary) text-white font-semibold shadow-sm'
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
          <div className="pb-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#4d6599] hover:text-(--primary) hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                logout
              </span>
              <p className="text-sm font-medium leading-normal">Cerrar Sesión</p>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col justify-between border-r border-[#d0d7e7] bg-white p-4 z-30">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col px-2">
            <h1 className="text-[#0e121b] text-lg font-bold leading-normal">
              Simplify IVA CR
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
                      ? 'bg-(--primary) text-white font-semibold shadow-sm'
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#4d6599] hover:text-(--primary) hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
              logout
            </span>
            <p className="text-sm font-medium leading-normal">Cerrar Sesión</p>
          </button>
        </div>
      </div>
    </>
  );
}
