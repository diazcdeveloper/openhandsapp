import { SaverSidebar } from '@/components/SaverSidebar'

export default function SaverDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SaverSidebar />
      <main className="flex-1 overflow-y-auto md:ml-72">
        {children}
      </main>
    </div>
  )
}
