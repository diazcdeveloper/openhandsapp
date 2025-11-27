import { CoordinatorSidebar } from '@/components/CoordinatorSidebar'

export default function CoordinatorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <CoordinatorSidebar />
      <main className="flex-1 overflow-y-auto md:ml-72">
        {children}
      </main>
    </div>
  )
}
