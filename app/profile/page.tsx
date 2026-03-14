import { Sidebar } from '../components/sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { buildInvoiceEmailForTaxId } from '@/lib/invoice-email';

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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const userTaxIdRows = await prisma.$queryRaw<{ taxId: string | null }[]>`
    SELECT "taxId"
    FROM "User"
    WHERE id = ${session.user.id}
    LIMIT 1
  `;

  const userTaxId = userTaxIdRows[0]?.taxId || '';

  async function updateTaxId(formData: FormData) {
    'use server';

    const currentSession = await getServerSession(authOptions);

    if (!currentSession?.user?.id) {
      redirect('/login');
    }

    const taxId = String(formData.get('taxId') || '').trim();

    if (!taxId) {
      redirect('/profile?status=empty');
    }

    try {
      const invoiceEmail = buildInvoiceEmailForTaxId(taxId);
      await prisma.$executeRaw`
        UPDATE "User"
        SET "taxId" = ${taxId}, "invoiceEmail" = ${invoiceEmail}
        WHERE id = ${currentSession.user.id}
      `;
    } catch (error) {
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code)
          : '';

      if (errorCode === 'P2002' || errorCode === '23505') {
        redirect('/profile?status=duplicate');
      }

      console.error('Error actualizando taxId:', error);
      redirect('/profile?status=error');
    }

    redirect('/profile?status=updated');
  }

  const params = await searchParams;
  const statusMessage = getStatusMessage(params.status);

  return (
    <>
      <Sidebar />

      <div className="relative flex h-screen w-full flex-row overflow-hidden md:pl-64">
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8f9fc]">
          <div className="flex flex-col w-full max-w-4xl mx-auto px-4 md:px-8 py-24 md:py-8 gap-6">
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
                    defaultValue={userTaxId}
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
          </div>
        </div>
      </div>
    </>
  );
}
