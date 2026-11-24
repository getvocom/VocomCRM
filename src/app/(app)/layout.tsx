import { Nav } from '@/components/nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page md:flex-row">
      <Nav />
      <main className="w-full min-w-0 flex-1 px-4 pb-12 pt-6 md:px-10 md:pt-7">{children}</main>
    </div>
  );
}
