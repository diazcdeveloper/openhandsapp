'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, FileText, RefreshCw, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { CreateGroupForm } from './CreateGroupForm'
import { GroupReportsDialog } from './GroupReportsDialog'
import { ManageCycleDialog } from './ManageCycleDialog'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface SavingsGroupCardProps {
  group: {
    id: number
    nombre_grupo: string
    numero_total_miembros?: number
    tipo_ahorro?: 'Simple' | 'Rosca' | 'Asca'
    grupo_juvenil?: boolean
    ciclos_ahorro?: Array<{
      id: number
      nombre_ciclo: string
      estado: 'activo' | 'terminado'
      fecha_inicio?: string
      fecha_fin?:string | null
    }>
  }
  onUpdate?: () => void
}

export function SavingsGroupCard({ group, onUpdate }: SavingsGroupCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false)
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Get the most recent cycle
  const cycle = group.ciclos_ahorro && group.ciclos_ahorro.length > 0 
    ? group.ciclos_ahorro.reduce((latest, current) => 
        current.id > latest.id ? current : latest
      )
    : null

  const handleEditSuccess = () => {
    setEditDialogOpen(false)
    onUpdate?.()
  }

  const handleCycleSuccess = () => {
    onUpdate?.()
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('grupos_ahorro')
        .delete()
        .eq('id', group.id)

      if (error) throw error

      toast.success('Grupo eliminado exitosamente')
      onUpdate?.()
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Error al eliminar el grupo')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <Card className="flex flex-col h-full">
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
              <span className="font-medium">{group.tipo_ahorro || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Miembros</span>
              <span className="font-medium">{group.numero_total_miembros || '-'}</span>
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
            
            {cycle && cycle.fecha_inicio && (
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
            onClick={() => setCycleDialogOpen(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Ciclos
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setReportsDialogOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Reportes
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Grupo de Ahorro</DialogTitle>
            <DialogDescription>
              Modifica la información del grupo de ahorro.
            </DialogDescription>
          </DialogHeader>
          <CreateGroupForm 
            onSuccess={handleEditSuccess} 
            initialData={group as any}
            groupId={group.id}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el grupo "{group.nombre_grupo}" y todos sus datos relacionados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cycle Dialog */}
      <ManageCycleDialog
        open={cycleDialogOpen}
        onOpenChange={setCycleDialogOpen}
        groupId={group.id}
        groupName={group.nombre_grupo}
        existingCycle={cycle}
        onSuccess={handleCycleSuccess}
      />

      {/* Reports Dialog */}
      <GroupReportsDialog
        open={reportsDialogOpen}
        onOpenChange={setReportsDialogOpen}
        groupId={group.id}
        groupName={group.nombre_grupo}
      />
    </>
  )
}
