'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FolderOpen, Activity, PiggyBank, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface DashboardStats {
  facilitatorsCount: number
  groupsCount: number
  cycleStats: {
    withoutCycle: number
    active: number
    terminated: number
  }
  totalSaved: number
  demographics: {
    men: number
    women: number
    children: number
    total: number
  }
}

export default function DirectorDashboardPage() {
  const { user } = useAuth()
  const [directorName, setDirectorName] = useState<string>('')
  const [stats, setStats] = useState<DashboardStats>({
    facilitatorsCount: 0,
    groupsCount: 0,
    cycleStats: { withoutCycle: 0, active: 0, terminated: 0 },
    totalSaved: 0,
    demographics: { men: 0, women: 0, children: 0, total: 0 }
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      // Get director info to know the country
      const { data: directorData } = await supabase
        .from('usuarios')
        .select('nombre, apellido, pais_residencia')
        .eq('id', user.id)
        .single()

      if (directorData) {
        setDirectorName(`${directorData.nombre} ${directorData.apellido}`)
        const country = directorData.pais_residencia

        if (country) {
          // 1. Count Facilitators in the country
          const { count: facilitatorsCount } = await supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('pais_residencia', country)
            .eq('rol', 'facilitador')

          // 2. Get all groups in the country directly by pais_operacion
          // This ensures we capture all groups operating in the country regardless of facilitator residence
          // and automatically includes new cities added to the country.
          const { data: groups } = await supabase
            .from('grupos_ahorro')
            .select(`
              id,
              cantidad_hombres,
              cantidad_mujeres,
              cantidad_ninos,
              cantidad_ninas,
              ciclos_ahorro (
                id,
                estado
              )
            `)
            .eq('pais_operacion', country)

          if (groups) {
            const groupsCount = groups.length
            let withoutCycle = 0
            let active = 0
            let terminated = 0
            let men = 0
            let women = 0
            let children = 0

            groups.forEach(group => {
              // Demographics
              men += group.cantidad_hombres || 0
              women += group.cantidad_mujeres || 0
              children += (group.cantidad_ninos || 0) + (group.cantidad_ninas || 0)

              // Cycles
              const cycles = Array.isArray(group.ciclos_ahorro) ? group.ciclos_ahorro : []
              if (cycles.length === 0) {
                withoutCycle++
              } else {
                const hasActive = cycles.some((c: any) => c.estado === 'activo')
                if (hasActive) active++
                else terminated++
              }
            })

            // 3. Total Saved (from reports)
            // We need reports from these groups
            const groupIds = groups.map(g => g.id)
            
            // If there are no groups, totalSaved is 0
            let totalSaved = 0
            
            if (groupIds.length > 0) {
              const { data: reports } = await supabase
                .from('reportes_grupos')
                .select('cantidad_ahorrada')
                .in('grupo_id', groupIds)

              totalSaved = reports?.reduce((sum, r) => sum + (r.cantidad_ahorrada || 0), 0) || 0
            }

            setStats({
              facilitatorsCount: facilitatorsCount || 0,
              groupsCount,
              cycleStats: { withoutCycle, active, terminated },
              totalSaved,
              demographics: {
                men,
                women,
                children,
                total: men + women + children
              }
            })
          }
        }
      }
    }

    fetchData()
  }, [user])

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Director</h1>
        <p className="text-muted-foreground">
          Bienvenido, {directorName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Facilitators Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facilitadores en el País</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.facilitatorsCount}</div>
            <p className="text-xs text-muted-foreground">Total registrados</p>
          </CardContent>
        </Card>

        {/* Groups Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos de Ahorro</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.groupsCount}</div>
            <p className="text-xs text-muted-foreground">Total en el país</p>
          </CardContent>
        </Card>

        {/* Total Saved */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ahorrado</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalSaved.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Según reportes entregados</p>
          </CardContent>
        </Card>

        {/* Cycle Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Ciclos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sin ciclo:</span>
                <span className="text-sm font-semibold">{stats.cycleStats.withoutCycle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Activos:</span>
                <span className="text-sm font-semibold text-green-600">{stats.cycleStats.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Terminados:</span>
                <span className="text-sm font-semibold text-red-600">{stats.cycleStats.terminated}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demographics */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demografía de Grupos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Hombres</span>
                <span className="text-xl font-bold">{stats.demographics.men}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Mujeres</span>
                <span className="text-xl font-bold">{stats.demographics.women}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Niños/as</span>
                <span className="text-xl font-bold">{stats.demographics.children}</span>
              </div>
              <div className="flex flex-col border-l pl-4">
                <span className="text-xs text-muted-foreground uppercase">Total</span>
                <span className="text-xl font-bold text-primary">{stats.demographics.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
