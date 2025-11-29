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
  grupo_id: number
  grupos_ahorro?: {
    nombre_grupo: string
    numero_total_miembros: number
  }
}

interface FacilitatorReportsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facilitatorId: string
  facilitatorName: string
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function FacilitatorReportsModal({
  open,
  onOpenChange,
  facilitatorId,
  facilitatorName
}: FacilitatorReportsModalProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadReports = async () => {
    setLoading(true)
    try {
      // Get all groups for this facilitator first
      const { data: groupsData, error: groupsError } = await supabase
        .from('grupos_ahorro')
        .select('id')
        .eq('facilitador_id', facilitatorId)

      if (groupsError) {
        console.error('Error loading groups:', groupsError)
        setLoading(false)
        return
      }

      if (!groupsData || groupsData.length === 0) {
        setReports([])
        setLoading(false)
        return
      }

      const groupIds = groupsData.map(g => g.id)

      // Get all reports for those groups
      const { data, error } = await supabase
        .from('reportes_grupos')
        .select(`
          *,
          grupos_ahorro (
            nombre_grupo,
            numero_total_miembros
          )
        `)
        .in('grupo_id', groupIds)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })

      if (error) {
        console.error('Error loading reports:', error)
      } else {
        setReports(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadReports()
    }
  }, [open, facilitatorId])

  const handleEditClick = (report: Report) => {
    setSelectedReport(report)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (report: Report) => {
    setSelectedReport(report)
    setDeleteDialogOpen(true)
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
      loadReports()
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Error al eliminar el reporte')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedReport(null)
    }
  }

  const handleReportSuccess = () => {
    setCreateDialogOpen(false)
    setEditDialogOpen(false)
    setSelectedReport(null)
    loadReports()
  }

  const getTotalMeetings = () => {
    return reports.reduce((sum, report) => sum + report.numero_reuniones, 0)
  }

  const getTotalSaved = () => {
    return reports.reduce((sum, report) => sum + Number(report.cantidad_ahorrada), 0)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reportes de {facilitatorName}</DialogTitle>
            <DialogDescription>
              Reportes mensuales de todos los grupos del facilitador
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {reports.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Reuniones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{getTotalMeetings()}</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Ahorrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold text-green-600">
                          ${getTotalSaved().toLocaleString('es-CO')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay reportes</h3>
                  <p className="text-muted-foreground">
                    Este facilitador no tiene reportes registrados
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => {
                    const groupName = Array.isArray(report.grupos_ahorro)
                      ? report.grupos_ahorro[0]?.nombre_grupo
                      : report.grupos_ahorro?.nombre_grupo
                    
                    return (
                      <Card key={report.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {monthNames[report.mes - 1]} {report.ano}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                Grupo: {groupName || 'Desconocido'}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(report)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(report)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Reuniones:</span>
                              <p className="font-medium">{report.numero_reuniones}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Miembros:</span>
                              <p className="font-medium">{report.grupos_ahorro?.numero_total_miembros || 0}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Promedio Asistencia:</span>
                              <p className="font-medium">{report.promedio_asistencia || 0}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cantidad ahorrada:</span>
                              <p className="font-medium text-green-600">
                                ${Number(report.cantidad_ahorrada).toLocaleString('es-CO')}
                              </p>
                            </div>
                          </div>

                          {report.comentarios && (
                            <div className="mt-3 pt-3 border-t">
                              <span className="text-muted-foreground text-sm">Comentarios:</span>
                              <p className="text-sm mt-1">{report.comentarios}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      {selectedReport && (
        <CreateReportDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          userId={facilitatorId}
          onSuccess={handleReportSuccess}
          initialData={{
            ...selectedReport,
            grupo_id: selectedReport.grupo_id.toString(),
            promedio_asistencia: selectedReport.promedio_asistencia || undefined,
            comentarios: selectedReport.comentarios || undefined
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este reporte.
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
    </>
  )
}
