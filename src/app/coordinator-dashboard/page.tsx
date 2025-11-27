'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FolderOpen, Activity } from 'lucide-react'

interface GroupStats {
  total: number
  withoutCycle: number
  active: number
  terminated: number
}

export default function CoordinatorDashboardPage() {
  const [facilitatorCount, setFacilitatorCount] = useState<number | null>(null)
  const [coordinatorName, setCoordinatorName] = useState<string>('')
  const [groupStats, setGroupStats] = useState<GroupStats>({
    total: 0,
    withoutCycle: 0,
    active: 0,
    terminated: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get coordinator info
      const { data: coordinatorData } = await supabase
        .from('usuarios')
        .select('nombre, apellido, zona_coordinacion')
        .eq('id', user.id)
        .single()

      if (coordinatorData) {
        setCoordinatorName(`${coordinatorData.nombre} ${coordinatorData.apellido}`)

        if (coordinatorData.zona_coordinacion) {
          // Count facilitators in the same zone
          const { count } = await supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('ciudad_residencia', coordinatorData.zona_coordinacion)
            .eq('rol', 'facilitador')

          setFacilitatorCount(count)

          // Get facilitators in zone
          const { data: facilitators } = await supabase
            .from('usuarios')
            .select('id')
            .eq('ciudad_residencia', coordinatorData.zona_coordinacion)
            .eq('rol', 'facilitador')

          if (facilitators && facilitators.length > 0) {
            const facilitatorIds = facilitators.map(f => f.id)

            // Get all groups from these facilitators
            const { data: groups } = await supabase
              .from('grupos_ahorro')
              .select(`
                id,
                ciclos_ahorro (
                  id,
                  estado
                )
              `)
              .in('facilitador_id', facilitatorIds)

            if (groups) {
              const stats: GroupStats = {
                total: groups.length,
                withoutCycle: 0,
                active: 0,
                terminated: 0
              }

              groups.forEach(group => {
                const cycles = Array.isArray(group.ciclos_ahorro) ? group.ciclos_ahorro : []
                
                if (cycles.length === 0) {
                  stats.withoutCycle++
                } else {
                  // Check if any cycle is active
                  const hasActiveCycle = cycles.some((cycle: any) => cycle.estado === 'activo')
                  if (hasActiveCycle) {
                    stats.active++
                  } else {
                    stats.terminated++
                  }
                }
              })

              setGroupStats(stats)
            }
          }
        }
      }
    }

    fetchData()
  }, [])

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Coordinador</h1>
        <p className="text-muted-foreground">
          Bienvenido, {coordinatorName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facilitadores en tu Zona</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilitatorCount !== null ? facilitatorCount : '-'}</div>
            <p className="text-xs text-muted-foreground">
              Total de facilitadores registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos de Ahorro</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total de grupos creados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Ciclos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sin ciclo:</span>
                <span className="text-sm font-semibold">{groupStats.withoutCycle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Activos:</span>
                <span className="text-sm font-semibold text-green-600">{groupStats.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Terminados:</span>
                <span className="text-sm font-semibold text-red-600">{groupStats.terminated}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
