'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Circle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Group {
  id: number
  nombre_grupo: string
  facilitador: {
    nombre: string
    apellido: string
  }
  ciclo: {
    estado: 'activo' | 'terminado'
  } | null
}

interface GroupSearchCardProps {
  userId: string
  onJoinSuccess: () => void
}

import { UpdateProfileDialog } from './UpdateProfileDialog'

// ... existing imports ...

export function GroupSearchCard({ userId, onJoinSuccess }: GroupSearchCardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState<number | null>(null)

  // Real-time search with debounce
  useEffect(() => {
    const searchGroups = async () => {
      // Only search if there is a query
      if (!searchQuery.trim()) {
        setGroups([])
        return
      }

      setLoading(true)
      
      try {
        // Build the query
        let query = supabase
          .from('grupos_ahorro')
          .select('id, nombre_grupo, facilitador_id')
          .ilike('nombre_grupo', `%${searchQuery}%`) // Always filter by name now

        // Execute query
        const { data: groupsData, error: groupsError } = await query.order('nombre_grupo')

        if (groupsError) throw groupsError

        if (!groupsData || groupsData.length === 0) {
          setGroups([])
          setLoading(false)
          return
        }

        // Get additional data
        const groupIds = groupsData.map(g => g.id)
        const facilitatorIds = [...new Set(groupsData.map(g => g.facilitador_id).filter(Boolean))]

        // Get facilitators
        const { data: facilitatorsData } = await supabase
          .from('usuarios')
          .select('id, nombre, apellido')
          .in('id', facilitatorIds)

        // Get cycles
        const { data: cyclesData } = await supabase
          .from('ciclos_ahorro')
          .select('id, grupo_id, estado')
          .in('grupo_id', groupIds)
          .order('created_at', { ascending: false })

        // Transform data
        const transformedData = groupsData.map(group => {
          const facilitator = facilitatorsData?.find(f => f.id === group.facilitador_id)
          const cycle = cyclesData?.find(c => c.grupo_id === group.id)

          return {
            id: group.id,
            nombre_grupo: group.nombre_grupo,
            facilitador: facilitator ? {
              nombre: facilitator.nombre,
              apellido: facilitator.apellido
            } : { nombre: 'Sin', apellido: 'asignar' },
            ciclo: cycle ? {
              estado: cycle.estado as 'activo' | 'terminado'
            } : null
          }
        })

        setGroups(transformedData)
      } catch (error) {
        console.error('Error in searchGroups:', error)
        toast.error('Error al cargar grupos')
        setGroups([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce search - wait 300ms after user stops typing
    const debounceTimer = setTimeout(() => {
      searchGroups()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const handleJoinGroup = async (groupId: number) => {
    setJoining(groupId)
    try {
      // First, get the active cycle for this group
      const { data: cycleData, error: cycleError } = await supabase
        .from('ciclos_ahorro')
        .select('id')
        .eq('grupo_id', groupId)
        .eq('estado', 'activo')
        .single()

      if (cycleError || !cycleData) {
        toast.error('Este grupo no tiene un ciclo activo')
        setJoining(null)
        return
      }

      // Check if user is already in another cycle
      const { data: existingParticipation } = await supabase
        .from('participantes_ciclo')
        .select('id')
        .eq('usuario_id', userId)
        .single()

      if (existingParticipation) {
        toast.error('Ya estás participando en un grupo. Solo puedes estar en un grupo a la vez.')
        setJoining(null)
        return
      }

      // Join the cycle
      const { error: joinError } = await supabase
        .from('participantes_ciclo')
        .insert({
          ciclo_id: cycleData.id,
          usuario_id: userId,
          proposito_personal: '',
          meta_ahorro_personal: 0
        })

      if (joinError) throw joinError

      toast.success('Te has unido al grupo exitosamente')
      onJoinSuccess()
    } catch (error) {
      console.error('Error joining group:', error)
      toast.error('Error al unirse al grupo')
    } finally {
      setJoining(null)
    }
  }

  const getCycleIcon = (cycle: Group['ciclo']) => {
    if (!cycle) {
      return <Circle className="h-4 w-4 text-gray-400" fill="currentColor" />
    }
    if (cycle.estado === 'activo') {
      return <Circle className="h-4 w-4 text-green-500" fill="currentColor" />
    }
    return <Circle className="h-4 w-4 text-red-500" fill="currentColor" />
  }

  const getCycleLabel = (cycle: Group['ciclo']) => {
    if (!cycle) return 'Sin ciclo'
    return cycle.estado === 'activo' ? 'Ciclo activo' : 'Ciclo terminado'
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Buscar Grupo de Ahorro</CardTitle>
          <CardDescription>
            Escribe para buscar grupos disponibles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Buscar por nombre del grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
            )}
          </div>

          {groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group) => (
                <Card key={group.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold text-lg">{group.nombre_grupo}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>Facilitador: {group.facilitador?.nombre} {group.facilitador?.apellido}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getCycleIcon(group.ciclo)}
                          <span>{getCycleLabel(group.ciclo)}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={joining === group.id || !group.ciclo || group.ciclo.estado !== 'activo'}
                        size="sm"
                      >
                        {joining === group.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Uniéndose...
                          </>
                        ) : (
                          'Unirse'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchQuery.trim() && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron grupos con ese nombre.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  )
}
