'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from 'lucide-react'
import { SavingsGroupCard } from '@/components/SavingsGroupCard'

interface FacilitatorGroupsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facilitatorId: string
  facilitatorName: string
}

interface SavingsGroup {
  id: number
  nombre_grupo: string
  numero_total_miembros: number
  tipo_ahorro?: 'Simple' | 'Rosca' | 'Asca'
  grupo_juvenil?: boolean
  mes_creacion?: number
  duracion_ciclo?: number
  cantidad_hombres?: number
  cantidad_mujeres?: number
  cantidad_ninos?: number
  cantidad_ninas?: number
  ano_creacion?: number
  ciudad_operacion?: string
  pais_operacion?: string
  ciclos_ahorro: {
    id: number
    nombre_ciclo: string
    estado: 'activo' | 'terminado'
    fecha_inicio: string
    fecha_fin?: string | null
  }[]
}

export function FacilitatorGroupsModal({ 
  open, 
  onOpenChange, 
  facilitatorId,
  facilitatorName 
}: FacilitatorGroupsModalProps) {
  const [groups, setGroups] = useState<SavingsGroup[]>([])
  const [loading, setLoading] = useState(true)

  const loadGroups = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('grupos_ahorro')
        .select(`
          id,
          nombre_grupo,
          numero_total_miembros,
          tipo_ahorro,
          grupo_juvenil,
          mes_creacion,
          duracion_ciclo,
          cantidad_hombres,
          cantidad_mujeres,
          cantidad_ninos,
          cantidad_ninas,
          ano_creacion,
          ciudad_operacion,
          pais_operacion,
          ciclos_ahorro (
            id,
            nombre_ciclo,
            estado,
            fecha_inicio,
            fecha_fin
          )
        `)
        .eq('facilitador_id', facilitatorId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading groups:', error)
      } else {
        setGroups(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadGroups()
    }
  }, [open, facilitatorId])

  const activeGroups = groups.filter(g => 
    g.ciclos_ahorro && g.ciclos_ahorro.some((c: any) => c.estado === 'activo')
  )
  
  const inactiveGroups = groups.filter(g => 
    !g.ciclos_ahorro || 
    g.ciclos_ahorro.length === 0 || 
    g.ciclos_ahorro.every((c: any) => c.estado === 'terminado')
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grupos de {facilitatorName}</DialogTitle>
          <DialogDescription>
            Gestiona los grupos de ahorro de este facilitador
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Este facilitador no tiene grupos de ahorro registrados
          </div>
        ) : (
          <div className="space-y-6">
            {activeGroups.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grupos Activos</h3>
                <div className="space-y-4">
                  {activeGroups.map((group) => (
                    <SavingsGroupCard 
                      key={group.id} 
                      group={group}
                      onUpdate={loadGroups}
                    />
                  ))}
                </div>
              </div>
            )}

            {inactiveGroups.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grupos Sin Ciclo Activo</h3>
                <div className="space-y-4">
                  {inactiveGroups.map((group) => (
                    <SavingsGroupCard 
                      key={group.id} 
                      group={group}
                      onUpdate={loadGroups}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
