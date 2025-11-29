'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Calendar, TrendingUp, Loader2, ChevronLeft, ChevronRight, Users } from 'lucide-react'
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

// ... existing imports ...

// ... existing interfaces and constants ...

function ReportsContent() {
  const searchParams = useSearchParams()
  const facilitatorId = searchParams.get('facilitator')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [coordinatorZone, setCoordinatorZone] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get coordinator's zone
        const { data: coordinatorData } = await supabase
          .from('usuarios')
          .select('zona_coordinacion')
          .eq('id', user.id)
          .single()

        if (!coordinatorData?.zona_coordinacion) {
          setLoading(false)
          return
        }

        setCoordinatorZone(coordinatorData.zona_coordinacion)

        // Get all facilitators in the zone
        const { data: facilitatorsData } = await supabase
          .from('usuarios')
          .select('id')
          .eq('rol', 'facilitador')
          .eq('ciudad_residencia', coordinatorData.zona_coordinacion)

        if (!facilitatorsData || facilitatorsData.length === 0) {
          setReports([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        const facilitatorIds = facilitatorsData.map(f => f.id)

        // Get all groups for those facilitators
        const { data: groupsData } = await supabase
          .from('grupos_ahorro')
          .select('id, facilitador_id, nombre_grupo, numero_total_miembros')
          .in('facilitador_id', facilitatorIds)

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
          // Enrich reports with group and facilitator info
          const enrichedReports = reportsData?.map(report => {
            const group = groupsData.find(g => g.id === report.grupo_id)
            const facilitator = facilitatorsData.find(f => f.id === group?.facilitador_id)
            return {
              ...report,
              grupos_ahorro: group ? { 
                nombre_grupo: group.nombre_grupo, 
                facilitador_id: group.facilitador_id,
                numero_total_miembros: group.numero_total_miembros 
              } : undefined
            }
          }) || []

          // Get facilitator names
          const facilitatorIdsInReports = [...new Set(enrichedReports.map(r => r.grupos_ahorro?.facilitador_id).filter(Boolean))]
          
          if (facilitatorIdsInReports.length > 0) {
            const { data: facilitatorsNames } = await supabase
              .from('usuarios')
              .select('id, nombre, apellido')
              .in('id', facilitatorIdsInReports)

            const reportsWithNames = enrichedReports.map(report => ({
              ...report,
              facilitador: facilitatorsNames?.find(f => f.id === report.grupos_ahorro?.facilitador_id)
            }))

            setReports(reportsWithNames)
          } else {
            setReports(enrichedReports)
          }
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [currentPage, facilitatorId])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getTotalMeetings = () => {
    return reports.reduce((sum, report) => sum + report.numero_reuniones, 0)
  }

  const getTotalSaved = () => {
    return reports.reduce((sum, report) => sum + Number(report.cantidad_ahorrada), 0)
  }

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
      if (r.grupos_ahorro && !uniqueGroups.has(r.grupos_ahorro.facilitador_id as any)) {
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
          Reportes mensuales de facilitadores en {coordinatorZone}
        </p>
      </div>

      {/* Month/Year Filter */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-lg">Resumen Mensual - {coordinatorZone}</CardTitle>
          <CardDescription>Selecciona un mes y año para ver estadísticas agregadas de tu zona</CardDescription>
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
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Reportes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">{totalCount}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Reuniones (página actual)</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Ahorrado (página actual)</CardTitle>
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
                No hay reportes registrados en tu zona
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {monthNames[report.mes - 1]} {report.ano}
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <div>Grupo: {report.grupos_ahorro?.nombre_grupo || 'Desconocido'}</div>
                        {report.facilitador && (
                          <div>Facilitador: {report.facilitador.nombre} {report.facilitador.apellido}</div>
                        )}
                      </CardDescription>
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
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
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
        </>
      )}
    </div>
  )
}

export default function CoordinatorReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  )
}
