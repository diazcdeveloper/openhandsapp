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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ActiveCycleInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleId: number
  groupName: string
}

interface CycleStats {
  totalSaved: number
  participantCount: number
  startDate: string
  endDate: string | null
  status: string
}

interface ParticipantProgress {
  userId: string
  name: string
  lastName: string
  totalSaved: number
}

export function ActiveCycleInfoDialog({ 
  open, 
  onOpenChange, 
  cycleId,
  groupName
}: ActiveCycleInfoDialogProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CycleStats | null>(null)
  const [participants, setParticipants] = useState<ParticipantProgress[]>([])

  useEffect(() => {
    if (open && cycleId) {
      loadCycleInfo()
    }
  }, [open, cycleId])

  const loadCycleInfo = async () => {
    setLoading(true)
    try {
      // 1. Get cycle details
      const { data: cycleData, error: cycleError } = await supabase
        .from('ciclos_ahorro')
        .select('*')
        .eq('id', cycleId)
        .single()

      if (cycleError) throw cycleError

      // 2. Get participants
      const { data: participantsData, error: partError } = await supabase
        .from('participantes_ciclo')
        .select(`
          usuario_id,
          usuarios (
            nombre,
            apellido
          )
        `)
        .eq('ciclo_id', cycleId)

      if (partError) throw partError

      // 3. Get all movements for this cycle
      const { data: movementsData, error: movError } = await supabase
        .from('movimientos_ahorro')
        .select('monto, usuario_id')
        .eq('ciclo_id', cycleId)

      if (movError) throw movError

      // Calculate totals
      const totalSaved = movementsData?.reduce((sum, m) => sum + Number(m.monto), 0) || 0
      
      // Calculate per-participant totals
      const participantsProgress = participantsData?.map(p => {
        const userTotal = movementsData
          ?.filter(m => m.usuario_id === p.usuario_id)
          .reduce((sum, m) => sum + Number(m.monto), 0) || 0
          
        // Handle the case where usuarios might be an array or object
        const user = Array.isArray(p.usuarios) ? p.usuarios[0] : p.usuarios

        return {
          userId: p.usuario_id,
          name: user?.nombre || 'Desconocido',
          lastName: user?.apellido || '',
          totalSaved: userTotal
        }
      }).sort((a, b) => b.totalSaved - a.totalSaved) || []

      setStats({
        totalSaved,
        participantCount: participantsData?.length || 0,
        startDate: cycleData.fecha_inicio,
        endDate: cycleData.fecha_fin,
        status: cycleData.estado
      })

      setParticipants(participantsProgress)

    } catch (error) {
      console.error('Error loading cycle info:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Información del Ciclo Activo</DialogTitle>
          <DialogDescription>
            Detalles y progreso del ciclo actual de {groupName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Ahorrado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 text-center">
                    ${stats.totalSaved.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    Participantes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-center">
                    {stats.participantCount}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Duración
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold text-center">
                    {format(new Date(stats.startDate), "d MMM yyyy", { locale: es })}
                    {stats.endDate && (
                      <> - {format(new Date(stats.endDate), "d MMM yyyy", { locale: es })}</>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Participants List */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Progreso por Participante
              </h3>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div 
                    key={participant.userId}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {participant.name[0]}{participant.lastName[0]}
                      </div>
                      <span className="font-medium text-sm">
                        {participant.name} {participant.lastName}
                      </span>
                    </div>
                    <span className="font-semibold text-green-600">
                      ${participant.totalSaved.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
                {participants.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No hay participantes registrados en este ciclo.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se pudo cargar la información del ciclo.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
