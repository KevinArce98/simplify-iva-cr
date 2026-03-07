'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PasswordInput } from '@/app/components/password-input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales inválidas. Por favor, intente de nuevo.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setError('Ocurrió un error. Por favor, intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-(--primary) rounded-2xl mb-4">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 40 }}>
                calculate
              </span>
            </div>
            <h2 className="text-[#0e121b] text-2xl font-bold">Simplify IVA CR</h2>
            <p className="text-[#4d6599] text-sm mt-2">Inicia sesión para continuar</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-xl">
                error
              </span>
              <p className="text-sm text-red-800 flex-1">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#0e121b] mb-2"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[#d0d7e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent text-[#0e121b]"
                placeholder="tu@email.com"
                disabled={isLoading}
              />
            </div>

            <PasswordInput
              id="password"
              label="Contraseña"
              value={password}
              onChange={setPassword}
              required
              placeholder="••••••••"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-(--primary) text-white py-3 rounded-lg font-medium hover:bg-(--primary-dark) focus:outline-none focus:ring-2 focus:ring-(--primary) focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#4d6599]">
              ¿No tienes una cuenta?{' '}
              <Link
                href="/register"
                className="text-(--primary) font-medium hover:text-(--primary-dark) transition-colors"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#4d6599] mt-6">
          Sistema de cálculo de IVA para Costa Rica
        </p>
      </div>
    </div>
  );
}
