
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

function WelcomeMessage() {
  const searchParams = useSearchParams()
  const welcome = searchParams.get('welcome')
  
  if (!welcome) return null
  
  return (
    <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
      <CardContent className="flex items-center gap-4 py-6">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        <div>
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
            ¡Usuario creado exitosamente!
          </h2>
          <p className="text-green-700 dark:text-green-400">
            Bienvenido a la plataforma de Fundación Open Hands.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardContent() {
  const [stats, setStats] = useState({
    groupCount: 0,
    totalMembers: 0,
    men: 0,
    women: 0,
    children: 0,
    totalSavings: 0,
    facilitatorName: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Get facilitator profile
          const { data: profile } = await supabase
            .from('usuarios')
            .select('nombre, apellido')
            .eq('id', user.id)
            .single()

          // Get groups data
          const { data: groups } = await supabase
            .from('grupos_ahorro')
            .select('numero_total_miembros, cantidad_hombres, cantidad_mujeres, cantidad_ninos, cantidad_ninas')
            .eq('facilitador_id', user.id)

          // Get reports data for savings
          const { data: reports } = await supabase
            .from('reportes_grupos')
            .select('cantidad_ahorrada')
            .eq('facilitador_id', user.id)

          if (groups) {
            const totalMembers = groups.reduce((sum, g) => sum + (g.numero_total_miembros || 0), 0)
            const men = groups.reduce((sum, g) => sum + (g.cantidad_hombres || 0), 0)
            const women = groups.reduce((sum, g) => sum + (g.cantidad_mujeres || 0), 0)
            const boys = groups.reduce((sum, g) => sum + (g.cantidad_ninos || 0), 0)
            const girls = groups.reduce((sum, g) => sum + (g.cantidad_ninas || 0), 0)

            const totalSavings = reports?.reduce((sum, r) => sum + (r.cantidad_ahorrada || 0), 0) || 0

            setStats({
              groupCount: groups.length,
              totalMembers,
              men,
              women,
              children: boys + girls,
              totalSavings,
              facilitatorName: profile ? `${profile.nombre} ${profile.apellido}` : '',
            })
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    getDashboardData()
  }, [])

  return (
    <div className="p-8 space-y-8">
      <Suspense fallback={null}>
        <WelcomeMessage />
      </Suspense>

      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          Bienvenido, {loading ? '...' : stats.facilitatorName}
        </h2>
        <p className="text-muted-foreground">
          Resumen de tus grupos y actividades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Grupos Creados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.groupCount}</div>
            <p className="text-xs text-muted-foreground">
              Total de grupos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Miembros Totales
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.totalMembers}</div>
            <div className="text-xs text-muted-foreground space-x-2">
              <span>H: {stats.men}</span>
              <span>M: {stats.women}</span>
              <span>N: {stats.children}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ahorro Total Reportado
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(stats.totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Acumulado de todos los reportes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}
