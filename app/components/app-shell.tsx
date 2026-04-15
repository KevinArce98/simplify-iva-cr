import { Sidebar } from './sidebar';

interface AppShellProps {
  children: React.ReactNode;
  maxWidth?: string;
}

export default function AppShell({ children, maxWidth = 'max-w-300' }: AppShellProps) {
  return (
    <>
      <Sidebar />
      <div className="relative flex h-screen w-full flex-row overflow-hidden md:pl-64">
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8f9fc]">
          <div className={`flex flex-col w-full ${maxWidth} mx-auto px-4 md:px-8 py-24 md:py-8 gap-8`}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
