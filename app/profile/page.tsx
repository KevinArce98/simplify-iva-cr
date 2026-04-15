import { getSession } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { updateTaxId } from './actions';
import AppShell from '../components/app-shell';

function getStatusMessage(status: string | undefined) {
  switch (status) {
    case 'updated':
      return {
        type: 'success' as const,
        title: 'Perfil actualizado',
        message: 'La identificación fiscal se guardó correctamente.',
      };
    case 'empty':
      return {
        type: 'error' as const,
        title: 'Dato requerido',
        message: 'La identificación fiscal es obligatoria.',
      };
    case 'duplicate':
      return {
        type: 'error' as const,
        title: 'Identificación en uso',
        message: 'Esa identificación fiscal ya está asociada a otra cuenta.',
      };
    case 'error':
      return {
        type: 'error' as const,
        title: 'No se pudo actualizar',
        message: 'Ocurrió un error al guardar los cambios.',
      };
    default:
      return null;
  }
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      taxId: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const statusMessage = getStatusMessage(params.status);

  return (
    <AppShell maxWidth="max-w-4xl">
      <div className="flex flex-col gap-1">
        <h2 className="text-[#0e121b] tracking-tight text-2xl md:text-[32px] font-bold leading-tight">
          Perfil
        </h2>
        <p className="text-[#4d6599] text-sm font-normal leading-normal">
          Actualiza tu identificación fiscal para clasificar automáticamente
          facturas de compra y venta.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border p-4 ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              statusMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}
          >
            {statusMessage.title}
          </p>
          <p
            className={`text-sm mt-1 ${
              statusMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {statusMessage.message}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#d0d7e7] shadow-sm p-6 md:p-8">
        <form action={updateTaxId} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#0e121b] mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={user.name || ''}
              readOnly
              className="w-full px-4 py-3 border border-[#d0d7e7] rounded-lg bg-[#f8f9fc] text-[#4d6599]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0e121b] mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full px-4 py-3 border border-[#d0d7e7] rounded-lg bg-[#f8f9fc] text-[#4d6599]"
            />
          </div>

          <div>
            <label
              htmlFor="taxId"
              className="block text-sm font-medium text-[#0e121b] mb-2"
            >
              Identificación fiscal
            </label>
            <input
              id="taxId"
              name="taxId"
              type="text"
              defaultValue={user.taxId || ''}
              required
              className="w-full px-4 py-3 border border-[#d0d7e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent text-[#0e121b]"
              placeholder="Ej: 3101123456"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 bg-(--primary) hover:bg-(--primary-dark) text-white text-sm font-bold shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              save
            </span>
            Guardar cambios
          </button>
        </form>
      </div>
    </AppShell>
  );
}
