'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FolderOpen, PiggyBank, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface CoordinatorStats {
  id: string
  nombre: string
  apellido: string
  zona: string
  facilitatorsCount: number
  groupsCount: number
  totalSaved: number
  demographics: {
    men: number
    women: number
    children: number
    total: number
  }
  groupStatus: {
    active: number
    terminated: number
    withoutCycle: number
  }
}

export default function CoordinatorsPage() {
  const { user } = useAuth()
  const [coordinators, setCoordinators] = useState<CoordinatorStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCoordinators = async () => {
      if (!user) return

      // Get director's country
      const { data: directorData } = await supabase
        .from('usuarios')
        .select('pais_residencia')
        .eq('id', user.id)
        .single()

      if (!directorData?.pais_residencia) return

      // Get all coordinators in the country
      const { data: coords } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, zona_coordinacion')
        .eq('pais_residencia', directorData.pais_residencia)
        .eq('rol', 'coordinador')

      if (coords) {
        const statsPromises = coords.map(async (coord) => {
          // 1. Facilitators in their zone
          const { count: facilitatorsCount } = await supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('ciudad_residencia', coord.zona_coordinacion) // Assuming zone matches city for now
            .eq('rol', 'facilitador')

          // 2. Groups in their zone (via facilitators)
          const { data: facilitators } = await supabase
            .from('usuarios')
            .select('id')
            .eq('ciudad_residencia', coord.zona_coordinacion)
            .eq('rol', 'facilitador')
          
          const facilitatorIds = facilitators?.map(f => f.id) || []
          
          let groupsCount = 0
          let totalSaved = 0
          let men = 0
          let women = 0
          let children = 0
          let active = 0
          let terminated = 0
          let withoutCycle = 0

          if (facilitatorIds.length > 0) {
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
              .in('facilitador_id', facilitatorIds)

            if (groups) {
              groupsCount = groups.length
              
              groups.forEach(group => {
                men += group.cantidad_hombres || 0
                women += group.cantidad_mujeres || 0
                children += (group.cantidad_ninos || 0) + (group.cantidad_ninas || 0)

                const cycles = Array.isArray(group.ciclos_ahorro) ? group.ciclos_ahorro : []
                if (cycles.length === 0) {
                  withoutCycle++
                } else {
                  const hasActive = cycles.some((c: any) => c.estado === 'activo')
                  if (hasActive) active++
                  else terminated++
                }
              })

              // Saved amount
              const groupIds = groups.map(g => g.id)
              const { data: reports } = await supabase
                .from('reportes_grupos')
                .select('cantidad_ahorrada')
                .in('grupo_id', groupIds)
              
              totalSaved = reports?.reduce((sum, r) => sum + (r.cantidad_ahorrada || 0), 0) || 0
            }
          }

          return {
            id: coord.id,
            nombre: coord.nombre,
            apellido: coord.apellido,
            zona: coord.zona_coordinacion || 'Sin zona',
            facilitatorsCount: facilitatorsCount || 0,
            groupsCount,
            totalSaved,
            demographics: {
              men,
              women,
              children,
              total: men + women + children
            },
            groupStatus: {
              active,
              terminated,
              withoutCycle
            }
          }
        })

        const results = await Promise.all(statsPromises)
        setCoordinators(results)
      }
      setLoading(false)
    }

    fetchCoordinators()
  }, [user])

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coordinadores</h1>
        <p className="text-muted-foreground">
          Gestión y estadísticas por coordinador
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {coordinators.map((coord) => (
          <Card key={coord.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{coord.nombre} {coord.apellido}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {coord.zona}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Facilitadores</span>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-bold">{coord.facilitatorsCount}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Grupos</span>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <span className="font-bold">{coord.groupsCount}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Demografía</span>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-1">
                    <div className="font-bold text-blue-700 dark:text-blue-300">{coord.demographics.men}</div>
                    <div className="text-[10px] text-blue-600/80">Homb</div>
                  </div>
                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded p-1">
                    <div className="font-bold text-pink-700 dark:text-pink-300">{coord.demographics.women}</div>
                    <div className="text-[10px] text-pink-600/80">Muj</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-1">
                    <div className="font-bold text-orange-700 dark:text-orange-300">{coord.demographics.children}</div>
                    <div className="text-[10px] text-orange-600/80">Niñ</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                    <div className="font-bold">{coord.demographics.total}</div>
                    <div className="text-[10px] text-gray-500">Total</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Ahorro Total</span>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <PiggyBank className="h-4 w-4" />
                  <span className="font-bold text-lg">
                    ${coord.totalSaved.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Estado de Grupos</span>
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 font-medium">Activos: {coord.groupStatus.active}</span>
                  <span className="text-red-600 font-medium">Terminados: {coord.groupStatus.terminated}</span>
                  <span className="text-gray-500">Sin ciclo: {coord.groupStatus.withoutCycle}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
