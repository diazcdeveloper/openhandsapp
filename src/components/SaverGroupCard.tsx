'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, Users, Target, Edit, Loader2, Circle, Trash2 } from 'lucide-react'
import { RegisterMovementDialog } from '@/components/RegisterMovementDialog'
import { UpdatePurposeDialog } from '@/components/UpdatePurposeDialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Movement {
  id: number
  fecha: string
  monto: number
  nota: string | null
}

interface Participant {
  usuario_id: string
  usuarios: {
    nombre: string
    apellido: string
  } | {
    nombre: string
    apellido: string
  }[]
  totalSaved?: number
}

interface GroupData {
  nombre_grupo: string
  facilitador: {
    nombre: string
    apellido: string
  }
}

interface SaverGroupCardProps {
  cycleId: number
  userId: string
  onCycleLeft?: () => void
}

export function SaverGroupCard({ cycleId, userId, onCycleLeft }: SaverGroupCardProps) {
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [totalSaved, setTotalSaved] = useState(0)
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updatePurposeDialogOpen, setUpdatePurposeDialogOpen] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null)
  const [cycleStatus, setCycleStatus] = useState<'activo' | 'terminado'>('activo')
  const [resetting, setResetting] = useState(false)
  const [showResetAlert, setShowResetAlert] = useState(false)
  const [movementToDelete, setMovementToDelete] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      // Get cycle and group info
      const { data: cycleData } = await supabase
        .from('ciclos_ahorro')
        .select(`
          grupo_id,
          estado,
          grupos_ahorro (
            nombre_grupo,
            usuarios!facilitador_id (
              nombre,
              apellido
            )
          )
        `)
        .eq('id', cycleId)
        .single()

      if (cycleData) {
        setCycleStatus(cycleData.estado as 'activo' | 'terminado')
        
        const group = Array.isArray(cycleData.grupos_ahorro) 
          ? cycleData.grupos_ahorro[0] 
          : cycleData.grupos_ahorro
        const facilitator = Array.isArray(group.usuarios) 
          ? group.usuarios[0] 
          : group.usuarios
        
        setGroupData({
          nombre_grupo: group.nombre_grupo,
          facilitador: facilitator
        })

        // If cycle is terminated, we don't need to load other data
        if (cycleData.estado === 'terminado') {
          setLoading(false)
          return
        }
      }

      // Get saver's participation info
      const { data: participationData } = await supabase
        .from('participantes_ciclo')
        .select('proposito_personal, meta_ahorro_personal')
        .eq('ciclo_id', cycleId)
        .eq('usuario_id', userId)
        .single()

      if (participationData) {
        setPurpose(participationData.proposito_personal || 'No definido')
      }

      // Get all participants
      const { data: participantsData } = await supabase
        .from('participantes_ciclo')
        .select(`
          usuario_id,
          usuarios!usuario_id (
            nombre,
            apellido
          )
        `)
        .eq('ciclo_id', cycleId)

      // Get all movements for the cycle to calculate totals per user
      const { data: allMovements } = await supabase
        .from('movimientos_ahorro')
        .select('usuario_id, monto')
        .eq('ciclo_id', cycleId)

      if (participantsData) {
        // Calculate total per user
        const participantsWithTotals = participantsData.map(p => {
          const userTotal = allMovements
            ?.filter(m => m.usuario_id === p.usuario_id)
            .reduce((sum, m) => sum + Number(m.monto), 0) || 0
            
          return {
            ...p,
            totalSaved: userTotal
          }
        })
        
        // Sort by total saved (optional, but nice)
        participantsWithTotals.sort((a, b) => b.totalSaved - a.totalSaved)
        
        setParticipants(participantsWithTotals)
      }

      // Get saver's movements
      const { data: movementsData } = await supabase
        .from('movimientos_ahorro')
        .select('*')
        .eq('ciclo_id', cycleId)
        .eq('usuario_id', userId)
        .order('fecha', { ascending: false })

      if (movementsData) {
        setMovements(movementsData)
        const total = movementsData.reduce((sum, m) => sum + Number(m.monto), 0)
        setTotalSaved(total)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar la información')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [cycleId, userId])

  const handleMovementSuccess = () => {
    setSelectedMovement(null)
    setDialogOpen(false)
    loadData()
  }

  const handleUpdatePurposeSuccess = () => {
    loadData()
  }

  const handleEditMovement = (movement: Movement) => {
    setSelectedMovement(movement)
    setDialogOpen(true)
  }

  const handleDeleteMovement = (movementId: number) => {
    setMovementToDelete(movementId)
  }

  const confirmDeleteMovement = async () => {
    if (!movementToDelete) return

    try {
      const { error } = await supabase
        .from('movimientos_ahorro')
        .delete()
        .eq('id', movementToDelete)

      if (error) throw error

      toast.success('Reunión eliminada')
      loadData()
    } catch (error) {
      console.error('Error deleting movement:', error)
      toast.error('Error al eliminar la reunión')
    } finally {
      setMovementToDelete(null)
    }
  }

  const handleNewMovement = () => {
    setSelectedMovement(null)
    setDialogOpen(true)
  }

  const handleStartNewCycle = async () => {
    setResetting(true)
    try {
      // 1. Delete movements
      const { error: movError } = await supabase
        .from('movimientos_ahorro')
        .delete()
        .eq('ciclo_id', cycleId)
        .eq('usuario_id', userId)

      if (movError) throw movError

      // 2. Delete participation
      const { error: partError } = await supabase
        .from('participantes_ciclo')
        .delete()
        .eq('ciclo_id', cycleId)
        .eq('usuario_id', userId)

      if (partError) throw partError

      toast.success('Información eliminada. Listo para un nuevo ciclo.')
      
      if (onCycleLeft) {
        onCycleLeft()
      }
    } catch (error) {
      console.error('Error resetting cycle:', error)
      toast.error('Error al reiniciar el ciclo')
    } finally {
      setResetting(false)
      setShowResetAlert(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Render terminated state
  if (cycleStatus === 'terminado') {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            {groupData?.nombre_grupo}
          </CardTitle>
          <CardDescription>
            Facilitador: {groupData?.facilitador.nombre} {groupData?.facilitador.apellido}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Circle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">Ciclo Terminado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              El ciclo de ahorro ha finalizado. Puedes comenzar un nuevo ciclo para unirte nuevamente.
            </p>
          </div>
          <Button 
            onClick={() => setShowResetAlert(true)}
            disabled={resetting}
            variant="default"
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Comenzar nuevo ciclo
          </Button>
        </CardContent>

        <AlertDialog open={showResetAlert} onOpenChange={setShowResetAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Comenzar un nuevo ciclo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará todo tu historial de ahorros y participación en este ciclo. 
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartNewCycle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, comenzar nuevo'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Group Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {groupData?.nombre_grupo}
                </CardTitle>
                <CardDescription>
                  Facilitador: {groupData?.facilitador.nombre} {groupData?.facilitador.apellido}
                </CardDescription>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowResetAlert(true)}
                disabled={resetting}
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Circle className="h-4 w-4 mr-2" />
                )}
                Nuevo Ciclo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Mi Propósito
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-1" 
                    onClick={() => setUpdatePurposeDialogOpen(true)}
                    title="Editar propósito"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{purpose}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Total Ahorrado
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${totalSaved.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Progreso del Grupo</h4>
              <div className="space-y-3">
                {participants.map((participant, idx) => {
                  const user = Array.isArray(participant.usuarios) 
                    ? participant.usuarios[0] 
                    : participant.usuarios
                  // @ts-ignore
                  const savedAmount = participant.totalSaved || 0
                  const isCurrentUser = participant.usuario_id === userId
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                          {user.nombre[0]}{user.apellido[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {user.nombre} {user.apellido}
                          </p>
                          {/* We could add a label here if it's the current user */}
                        </div>
                      </div>
                      <div className="font-semibold text-green-600">
                        ${savedAmount.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movements Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mis Reuniones</CardTitle>
                <CardDescription>Historial de ahorros por reunión</CardDescription>
              </div>
              <Button onClick={handleNewMovement} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Reunión
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No has registrado movimientos aún.</p>
                <p className="text-sm mt-2">Haz clic en "Registrar Reunión" para comenzar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {movements.map((movement) => (
                  <Card key={movement.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-green-600">
                              ${Number(movement.monto).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(movement.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          {movement.nota && (
                            <p className="text-sm italic text-muted-foreground mt-2">
                              "{movement.nota}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditMovement(movement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteMovement(movement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RegisterMovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cycleId={cycleId}
        userId={userId}
        onSuccess={handleMovementSuccess}
        initialData={selectedMovement || undefined}
      />

      <UpdatePurposeDialog
        open={updatePurposeDialogOpen}
        onOpenChange={setUpdatePurposeDialogOpen}
        cycleId={cycleId}
        userId={userId}
        currentPurpose={purpose}
        onSuccess={handleUpdatePurposeSuccess}
      />

      {/* Reset Cycle Alert */}
      <AlertDialog open={showResetAlert} onOpenChange={setShowResetAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Comenzar un nuevo ciclo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará todo tu historial de ahorros y participación en este ciclo. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNewCycle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, comenzar nuevo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Movement Alert */}
      <AlertDialog open={!!movementToDelete} onOpenChange={(open) => !open && setMovementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reunión?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el registro de esta reunión y ajustará tu total ahorrado.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMovement} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
