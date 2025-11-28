import { DirectorSidebar } from '@/components/DirectorSidebar'

export default function DirectorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DirectorSidebar />
      <main className="flex-1 overflow-y-auto md:ml-72">
        {children}
      </main>
    </div>
  )
}
