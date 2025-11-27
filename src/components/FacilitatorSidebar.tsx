
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Home, Users, LogOut, Menu, MoreVertical, User as UserIcon, Bell, CreditCard, Settings, HelpCircle, Search, FileText } from 'lucide-react'
import { UpdateProfileDialog } from './UpdateProfileDialog'
import { User } from '@supabase/supabase-js'

interface FacilitatorSidebarProps {
  className?: string
}

interface UserProfile {
  nombre: string
  apellido: string
}

export function FacilitatorSidebar({ className }: FacilitatorSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [open, setOpen] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('nombre, apellido')
          .eq('id', user.id)
          .single()
        
        if (data) {
          setProfile(data)
        }
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase
          .from('usuarios')
          .select('nombre, apellido')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const routes = [
    {
      label: 'Inicio',
      icon: Home,
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      label: 'Grupo de ahorro',
      icon: Users,
      href: '/dashboard/savings-group',
      active: pathname === '/dashboard/savings-group',
    },
    {
      label: 'Reportes',
      icon: FileText,
      href: '/dashboard/reports',
      active: pathname === '/dashboard/reports',
    },
  ]

  const SidebarContent = () => (
    <div className="flex h-full flex-col space-y-4 py-8 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-2 px-4">
          <div className="relative h-8 w-8">
            <img 
              src="/images/logo.png" 
              alt="Open Hands Logo" 
              className="object-contain"
            />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            Open Hands
          </h2>
        </div>
        <p className="px-4 text-sm text-muted-foreground">
          Panel de Facilitador
        </p>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                route.active ? "bg-gray-200 dark:bg-gray-700" : "transparent"
              )}
            >
              <route.icon className="mr-2 h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-auto px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-auto p-2 hover:bg-gray-200 dark:hover:bg-gray-700">
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>{profile ? `${profile.nombre[0]}${profile.apellido[0]}` : 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left overflow-hidden flex-1">
                  <span className="truncate text-sm font-semibold">
                    {profile ? `${profile.nombre} ${profile.apellido}` : 'Usuario'}
                  </span>
                  <span className="truncate text-xs text-gray-500 font-normal">Facilitador</span>
                </div>
                <MoreVertical className="ml-auto h-4 w-4 text-gray-500" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" side="right" sideOffset={4}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-base font-medium leading-none">{profile ? `${profile.nombre} ${profile.apellido}` : 'Usuario'}</p>
                <p className="text-sm leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowProfileDialog(true)} className="text-base">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Cuenta</span>
            </DropdownMenuItem>
            {/* <DropdownMenuItem className="text-base">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-base">
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 text-base">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {user && (
        <UpdateProfileDialog 
          open={showProfileDialog} 
          onOpenChange={setShowProfileDialog}
          userId={user.id}
        />
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" className="md:hidden fixed top-4 left-4 z-40 h-10 w-10" size="icon">
            <Menu className="h-8 w-8" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn("hidden border-r bg-gray-100/40 md:block w-72 fixed inset-y-0 left-0 z-30", className)}>
        <SidebarContent />
      </div>
    </>
  )
}
