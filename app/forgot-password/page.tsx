'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/app/components/password-input';
import { requestPasswordResetCode, resetPasswordWithCode } from './actions';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const result = await requestPasswordResetCode({ email });

      if ('error' in result) {
        setError(result.error || 'No se pudo procesar la solicitud.');
        return;
      }

      setMessage(result.message || 'Revisa tu correo para ver el código.');
      setStep('reset');
    } catch {
      setError('Ocurrió un error. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPasswordWithCode({
        email,
        code,
        newPassword,
      });

      if (!result.success) {
        setError(result.error || 'No se pudo restablecer la contraseña.');
        return;
      }

      setMessage(result.message || 'Contraseña actualizada.');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch {
      setError('Ocurrió un error. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-(--primary) rounded-2xl mb-4">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 36 }}>
                lock_reset
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0e121b]">Recuperar contraseña</h1>
            <p className="text-[#4d6599] text-sm mt-2">
              {step === 'request'
                ? 'Te enviaremos un código de verificación a tu correo.'
                : 'Ingresa el código y define tu nueva contraseña.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-xl">error</span>
              <p className="text-sm text-red-800 flex-1">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
              <p className="text-sm text-green-800 flex-1">{message}</p>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
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
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-[#d0d7e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent text-[#0e121b]"
                  placeholder="tu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-(--primary) text-white py-3 rounded-lg font-medium hover:bg-(--primary-dark) focus:outline-none focus:ring-2 focus:ring-(--primary) focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span>Enviando código...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">mail</span>
                    <span>Enviar código</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label
                  htmlFor="email-confirm"
                  className="block text-sm font-medium text-[#0e121b] mb-2"
                >
                  Correo electrónico
                </label>
                <input
                  id="email-confirm"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-[#d0d7e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent text-[#0e121b]"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-[#0e121b] mb-2"
                >
                  Código de 6 dígitos
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-[#d0d7e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent text-[#0e121b] tracking-[0.3em]"
                  placeholder="123456"
                />
              </div>

              <PasswordInput
                id="newPassword"
                label="Nueva contraseña"
                value={newPassword}
                onChange={setNewPassword}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                disabled={isLoading}
              />

              <PasswordInput
                id="confirmPassword"
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                minLength={8}
                placeholder="Repite tu nueva contraseña"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-(--primary) text-white py-3 rounded-lg font-medium hover:bg-(--primary-dark) focus:outline-none focus:ring-2 focus:ring-(--primary) focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span>Actualizando contraseña...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">password</span>
                    <span>Cambiar contraseña</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                  setMessage('');
                }}
                disabled={isLoading}
                className="w-full border border-[#d0d7e7] text-[#0e121b] py-3 rounded-lg font-medium hover:bg-[#f8f9fc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Solicitar un código nuevo
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-[#4d6599]">
              <Link
                href="/login"
                className="text-(--primary) font-medium hover:text-(--primary-dark) transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
