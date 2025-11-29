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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, TrendingUp, Loader2, Edit, Trash2, Users } from 'lucide-react'
import { CreateReportDialog } from '@/components/CreateReportDialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Report {
  id: number
  mes: number
  ano: number
  numero_reuniones: number
  promedio_asistencia: number | null
  cantidad_ahorrada: number
  comentarios: string | null
  created_at: string
  grupos_ahorro?: {
    numero_total_miembros: number
  }
}

interface GroupReportsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  groupName: string
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function GroupReportsDialog({ open, onOpenChange, groupId, groupName }: GroupReportsDialogProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchReports = async () => {
    if (!open || !groupId) return
    
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const { data, error } = await supabase
      .from('reportes_grupos')
      .select(`
        *,
        grupos_ahorro (
          numero_total_miembros
        )
      `)
      .eq('grupo_id', groupId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReports(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [open, groupId])

  const handleEditClick = (report: Report) => {
    setSelectedReport(report)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (report: Report) => {
    setSelectedReport(report)
    setDeleteDialogOpen(true)
  }

  const handleEditSuccess = () => {
    setEditDialogOpen(false)
    setSelectedReport(null)
    fetchReports()
  }

  const handleDeleteConfirm = async () => {
    if (!selectedReport) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('reportes_grupos')
        .delete()
        .eq('id', selectedReport.id)

      if (error) throw error

      toast.success('Reporte eliminado exitosamente')
      fetchReports()
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Error al eliminar el reporte')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedReport(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reportes del Grupo: {groupName}</DialogTitle>
            <DialogDescription>
              Historial de reportes mensuales registrados para este grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay reportes registrados para este grupo.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium flex justify-between items-center">
                        <span>{monthNames[report.mes - 1]} {report.ano}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Creado el {format(new Date(report.created_at), "d 'de' MMM, yyyy", { locale: es })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Reuniones:
                        </span>
                        <span className="font-medium">{report.numero_reuniones}</span>
                      </div>
                      {report.grupos_ahorro && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> Total Miembros:
                          </span>
                          <span className="font-medium">{report.grupos_ahorro.numero_total_miembros || 0}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Promedio Asistencia:
                        </span>
                        <span className="font-medium">{report.promedio_asistencia || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Ahorrado:
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${Number(report.cantidad_ahorrada).toLocaleString('es-CO')}
                        </span>
                      </div>
                      {report.comentarios && (
                        <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
                          <p className="line-clamp-2 italic">"{report.comentarios}"</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditClick(report)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDeleteClick(report)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <CreateReportDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
        userId={userId}
        initialData={selectedReport ? {
          grupo_id: groupId.toString(),
          ano: selectedReport.ano,
          mes: selectedReport.mes,
          numero_reuniones: selectedReport.numero_reuniones,
          promedio_asistencia: selectedReport.promedio_asistencia || undefined,
          cantidad_ahorrada: selectedReport.cantidad_ahorrada,
          comentarios: selectedReport.comentarios || '',
        } : undefined}
        reportId={selectedReport?.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el reporte mensual.
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
    </>
  )
}
