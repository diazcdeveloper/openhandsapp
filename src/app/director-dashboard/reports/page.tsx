'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Calendar, TrendingUp, Loader2, ChevronLeft, ChevronRight, Users, PiggyBank } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Report {
  id: number
  mes: number
  ano: number
  grupo_id: number
  numero_reuniones: number
  promedio_asistencia: number | null
  cantidad_ahorrada: number
  comentarios: string | null
  created_at: string
  grupos_ahorro?: {
    nombre_grupo: string
    facilitador_id: string
    numero_total_miembros: number
  }
  facilitador?: {
    nombre: string
    apellido: string
  }
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const ITEMS_PER_PAGE = 8

import { Suspense } from 'react'

function ReportsContent() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [directorCountry, setDirectorCountry] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true)
      try {
        if (!user) return

        // Get director's country
        const { data: directorData } = await supabase
          .from('usuarios')
          .select('pais_residencia')
          .eq('id', user.id)
          .single()

        if (!directorData?.pais_residencia) {
          toast.error('No se pudo determinar el país de operación')
          setLoading(false)
          return
        }

        setDirectorCountry(directorData.pais_residencia)

        // Get all groups in the country
        const { data: groupsData } = await supabase
          .from('grupos_ahorro')
          .select('id, facilitador_id, nombre_grupo, numero_total_miembros')
          .eq('pais_operacion', directorData.pais_residencia)

        if (!groupsData || groupsData.length === 0) {
          setReports([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        const groupIds = groupsData.map(g => g.id)

        // Get total count for pagination
        const { count } = await supabase
          .from('reportes_grupos')
          .select('*', { count: 'exact', head: true })
          .in('grupo_id', groupIds)

        setTotalCount(count || 0)

        // Get reports with pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1

        const { data: reportsData, error } = await supabase
          .from('reportes_grupos')
          .select('*')
          .in('grupo_id', groupIds)
          .order('ano', { ascending: false })
          .order('mes', { ascending: false })
          .range(from, to)

        if (error) {
          console.error('Error loading reports:', error)
        } else {
          // Enrich reports with group info
          const enrichedReports = reportsData?.map(report => {
            const group = groupsData.find(g => g.id === report.grupo_id)
            return {
              ...report,
              grupos_ahorro: group ? { 
                nombre_grupo: group.nombre_grupo, 
                facilitador_id: group.facilitador_id,
                numero_total_miembros: group.numero_total_miembros 
              } : undefined
            }
          }) || []

          setReports(enrichedReports)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [currentPage, user])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const filteredReports = reports.filter(
      r => r.ano === selectedYear && r.mes === selectedMonth
    )

    if (filteredReports.length === 0) {
      return null
    }

    // Get unique groups to avoid counting members twice
    const uniqueGroups = new Map<number, number>()
    filteredReports.forEach(r => {
      if (r.grupos_ahorro && !uniqueGroups.has(r.grupo_id as any)) {
        const groupKey = `${r.grupos_ahorro.facilitador_id}_${r.grupos_ahorro.nombre_grupo}`
        if (!uniqueGroups.has(groupKey as any)) {
          uniqueGroups.set(groupKey as any, r.grupos_ahorro.numero_total_miembros)
        }
      }
    })

    const totalMembers = Array.from(uniqueGroups.values()).reduce((sum, count) => sum + count, 0)
    const totalAttendance = filteredReports.reduce((sum, r) => sum + (r.promedio_asistencia || 0), 0)
    const totalSavings = filteredReports.reduce((sum, r) => sum + r.cantidad_ahorrada, 0)

    return {
      reportCount: filteredReports.length,
      groupCount: uniqueGroups.size,
      totalMembers,
      totalAttendance,
      totalSavings
    }
  }, [reports, selectedYear, selectedMonth])

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Reportes mensuales de {directorCountry}
        </p>
      </div>

      {/* Month/Year Filter */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-lg">Resumen Mensual - {directorCountry}</CardTitle>
          <CardDescription>Selecciona un mes y año para ver estadísticas agregadas del país</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Año</label>
              <Input
                type="number"
                min={2020}
                max={2100}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {monthlySummary ? (
            <div className="mt-4 p-4 bg-background rounded-lg border">
              <h3 className="font-semibold mb-3 text-lg">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Reportes
                  </p>
                  <p className="text-2xl font-bold">{monthlySummary.reportCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Grupos
                  </p>
                  <p className="text-2xl font-bold">{monthlySummary.groupCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Total Miembros
                  </p>
                  <p className="text-2xl font-bold">{monthlySummary.totalMembers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Promedio Asistencia
                  </p>
                  <p className="text-2xl font-bold">{monthlySummary.totalAttendance}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Total Ahorrado
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ${monthlySummary.totalSavings.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-muted rounded-lg text-center text-muted-foreground">
              No hay reportes para {monthNames[selectedMonth - 1]} {selectedYear}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {reports.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{report.grupos_ahorro?.nombre_grupo || 'Sin grupo'}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {monthNames[report.mes - 1]} {report.ano}
                    </p>
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
                      <p className="text-xs text-muted-foreground mt-4">{report.comentarios}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {reports.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-muted-foreground mb-2">
                  No hay reportes disponibles
                </p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Los reportes de los facilitadores aparecerán aquí
                </p>
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-2 px-4">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DirectorReportsPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ReportsContent />
    </Suspense>
  )
}
