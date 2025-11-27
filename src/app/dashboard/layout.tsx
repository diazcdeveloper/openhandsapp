import { FacilitatorSidebar } from '@/components/FacilitatorSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full relative">
      <FacilitatorSidebar />
      <main className="md:pl-72 h-full pt-16 md:pt-0">
        {children}
      </main>
    </div>
  )
}
