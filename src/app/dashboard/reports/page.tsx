'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, Calendar, Users, TrendingUp, Edit, Trash2, Loader2 } from 'lucide-react'
import { CreateReportDialog } from '@/components/CreateReportDialog'
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
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Report {
  id: number
  mes: number
  grupo_id: number
  numero_reuniones: number
  cantidad_ahorrada: number
  comentarios: string | null
  created_at: string
  grupo: {
    nombre_grupo: string
  }
  ano?: number
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data, error } = await supabase
        .from('reportes_grupos')
        .select(`
          id,
          mes,
          ano,
          grupo_id,
          numero_reuniones,
          cantidad_ahorrada,
          comentarios,
          created_at,
          grupos_ahorro (
            nombre_grupo
          )
        `)
        .eq('facilitador_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching reports:', error)
        return
      }

      // Transform the data to match our Report interface
      const transformedData = data?.map(report => {
        return {
          id: report.id,
          mes: report.mes,
          grupo_id: report.grupo_id,
          numero_reuniones: report.numero_reuniones,
          cantidad_ahorrada: report.cantidad_ahorrada,
          comentarios: report.comentarios,
          created_at: report.created_at,
          grupo: {
            nombre_grupo: (Array.isArray(report.grupos_ahorro) 
              ? report.grupos_ahorro[0] 
              : report.grupos_ahorro)?.nombre_grupo || 'Grupo desconocido'
          },
          ano: report.ano
        }
      }) || []

      setReports(transformedData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleSuccess = () => {
    setDialogOpen(false)
    setSelectedReport(null)
    fetchReports()
  }

  const handleEditClick = (report: Report) => {
    setSelectedReport(report)
    setDialogOpen(true)
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Mensuales</h1>
          <p className="text-muted-foreground">
            Gestiona los reportes mensuales de tus grupos de ahorro
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Reporte
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin reportes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No has creado ningún reporte mensual todavía
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer reporte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{report.grupo.nombre_grupo}</span>
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </CardTitle>
                <CardDescription>
                  {monthNames[report.mes - 1]} {report.ano || new Date(report.created_at).getFullYear()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reuniones:</span>
                  <span className="ml-auto font-medium">{report.numero_reuniones}</span>
                </div>
                <div className="flex items-center text-sm">
                  <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ahorrado:</span>
                  <span className="ml-auto font-medium">
                    ${Number(report.cantidad_ahorrada).toLocaleString('es-CO')}
                  </span>
                </div>
                {report.comentarios && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.comentarios}
                    </p>
                  </div>
                )}
                <div className="pt-2 text-xs text-muted-foreground">
                  Creado: {format(new Date(report.created_at), "d 'de' MMM, yyyy", { locale: es })}
                </div>
                <div className="flex gap-2 pt-3 border-t">
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

      <CreateReportDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
        userId={userId}
        initialData={selectedReport ? {
          grupo_id: selectedReport.grupo_id.toString(),
          ano: selectedReport.ano || new Date(selectedReport.created_at).getFullYear(),
          mes: selectedReport.mes,
          numero_reuniones: selectedReport.numero_reuniones,
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
    </div>
  )
}
