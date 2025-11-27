'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, FileText, Edit, Trash2, Loader2, RefreshCw, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { CreateGroupForm } from '@/components/CreateGroupForm'
import { GroupReportsDialog } from '@/components/GroupReportsDialog'
import { ManageCycleDialog } from '@/components/ManageCycleDialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface SavingsGroup {
  id: number
  nombre_grupo: string
  ciudad_operacion: string
  numero_total_miembros: number
  ano_creacion: number
  mes_creacion: number
  tipo_ahorro: 'Simple' | 'Rosca' | 'Asca'
  duracion_ciclo: number
  cantidad_hombres: number
  cantidad_mujeres: number
  cantidad_ninos: number
  cantidad_ninas: number
  grupo_juvenil: boolean
  pais_operacion: string
}

interface Cycle {
  id: number
  nombre_ciclo: string
  fecha_inicio: string
  fecha_fin: string | null
  estado: 'activo' | 'terminado'
  grupo_id: number
}

export default function SavingsGroupPage() {
  const [groups, setGroups] = useState<SavingsGroup[]>([])
  const [cycles, setCycles] = useState<Map<number, Cycle>>(new Map())
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false)
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<SavingsGroup | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('grupos_ahorro')
        .select('*')
        .eq('facilitador_id', user.id)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setGroups(data)
        // Load cycles for all groups
        loadCycles(data.map(g => g.id))
      }
    }
    setLoading(false)
  }

  const loadCycles = async (groupIds: number[]) => {
    if (groupIds.length === 0) return
    
    const { data, error } = await supabase
      .from('ciclos_ahorro')
      .select('*')
      .in('grupo_id', groupIds)
    
    if (!error && data) {
      const cycleMap = new Map<number, Cycle>()
      data.forEach((cycle) => {
        // Only keep one cycle per group (most recent one)
        if (!cycleMap.has(cycle.grupo_id) || cycle.id > cycleMap.get(cycle.grupo_id)!.id) {
          cycleMap.set(cycle.grupo_id, cycle)
        }
      })
      setCycles(cycleMap)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false)
    loadGroups()
  }

  const handleEditSuccess = () => {
    setEditDialogOpen(false)
    setSelectedGroup(null)
    loadGroups()
  }

  const handleEditClick = (group: SavingsGroup) => {
    setSelectedGroup(group)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (group: SavingsGroup) => {
    setSelectedGroup(group)
    setDeleteDialogOpen(true)
  }

  const handleReportsClick = (group: SavingsGroup) => {
    setSelectedGroup(group)
    setReportsDialogOpen(true)
  }

  const handleCycleClick = (group: SavingsGroup) => {
    setSelectedGroup(group)
    setCycleDialogOpen(true)
  }

  const handleCycleSuccess = () => {
    // Reload all cycles for all groups to ensure state consistency
    const groupIds = groups.map(g => g.id)
    if (groupIds.length > 0) {
      loadCycles(groupIds)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedGroup) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('grupos_ahorro')
        .delete()
        .eq('id', selectedGroup.id)

      if (error) throw error

      toast.success('Grupo eliminado exitosamente')
      loadGroups()
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Error al eliminar el grupo')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedGroup(null)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos de Ahorro</h1>
          <p className="text-muted-foreground">
            Gestiona tus grupos de ahorro y sus miembros.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Grupo de Ahorro</DialogTitle>
              <DialogDescription>
                Completa la información del nuevo grupo de ahorro.
              </DialogDescription>
            </DialogHeader>
            <CreateGroupForm onSuccess={handleCreateSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Cargando grupos...</p>
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No tienes grupos de ahorro</h3>
            <p className="text-muted-foreground mb-4">Comienza creando tu primer grupo de ahorro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const cycle = cycles.get(group.id)
            return (
              <Card key={group.id} className="flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold">{group.nombre_grupo}</CardTitle>
                    {group.grupo_juvenil && (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Juvenil
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider">Tipo</span>
                      <span className="font-medium">{group.tipo_ahorro}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider">Miembros</span>
                      <span className="font-medium">{group.numero_total_miembros}</span>
                    </div>
                  </div>

                  <div className={`rounded-lg p-3 border ${
                    !cycle 
                      ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700' 
                      : cycle.estado === 'activo'
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {cycle?.estado === 'activo' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : cycle?.estado === 'terminado' ? (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-500" />
                      )}
                      <span className={`text-sm font-semibold ${
                        !cycle 
                          ? 'text-gray-700 dark:text-gray-300'
                          : cycle.estado === 'activo'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                      }`}>
                        {!cycle ? 'Sin Ciclo' : cycle.estado === 'activo' ? 'Ciclo Activo' : 'Ciclo Terminado'}
                      </span>
                    </div>
                    
                    {cycle && (
                      <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Inicio: {format(new Date(cycle.fecha_inicio), 'dd MMM yyyy', { locale: es })}</span>
                        </div>
                        {cycle.fecha_fin && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Fin: {format(new Date(cycle.fecha_fin), 'dd MMM yyyy', { locale: es })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2 pt-0">
                  <Button 
                    variant={!cycle ? 'outline' : cycle.estado === 'activo' ? 'default' : 'destructive'}
                    className={`w-full ${
                      cycle?.estado === 'activo' ? 'bg-green-600 hover:bg-green-700' : ''
                    }`}
                    onClick={() => handleCycleClick(group)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ciclos
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleReportsClick(group)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Reportes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleEditClick(group)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => handleDeleteClick(group)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Grupo de Ahorro</DialogTitle>
            <DialogDescription>
              Modifica la información del grupo de ahorro.
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <CreateGroupForm 
              onSuccess={handleEditSuccess} 
              initialData={selectedGroup}
              groupId={selectedGroup.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Group Reports Dialog */}
      {selectedGroup && (
        <GroupReportsDialog 
          open={reportsDialogOpen} 
          onOpenChange={setReportsDialogOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.nombre_grupo}
        />
      )}

      {/* Manage Cycle Dialog */}
      {selectedGroup && (
        <ManageCycleDialog
          open={cycleDialogOpen}
          onOpenChange={setCycleDialogOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.nombre_grupo}
          existingCycle={cycles.get(selectedGroup.id) || null}
          onSuccess={handleCycleSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el grupo 
              <strong> {selectedGroup?.nombre_grupo} </strong>
              y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                handleDeleteConfirm()
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
