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
import { PDFDownloadLink } from '@react-pdf/renderer'
import { DirectorReportPDF } from '@/components/DirectorReportPDF'

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
    tipo_ahorro: 'Simple' | 'Rosca' | 'Asca'
    grupo_juvenil: boolean
    cantidad_hombres: number
    cantidad_mujeres: number
    cantidad_ninos: number
    cantidad_ninas: number
  }
  facilitador?: {
    nombre: string
    apellido: string
  }
}

interface Group {
  id: number
  facilitador_id: string
  nombre_grupo: string
  numero_total_miembros: number
  tipo_ahorro: 'Simple' | 'Rosca' | 'Asca'
  grupo_juvenil: boolean
  cantidad_hombres: number
  cantidad_mujeres: number
  cantidad_ninos: number
  cantidad_ninas: number
  ano_creacion: number
  mes_creacion: number
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
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [directorCountry, setDirectorCountry] = useState<string>('')
  const [directorName, setDirectorName] = useState<string>('')
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
          .select('pais_residencia, nombre, apellido')
          .eq('id', user.id)
          .single()

        if (!directorData?.pais_residencia) {
          toast.error('No se pudo determinar el país de operación')
          setLoading(false)
          return
        }

        setDirectorCountry(directorData.pais_residencia)
        setDirectorName(`${directorData.nombre} ${directorData.apellido}`)

        // Get all groups in the country
        const { data: groupsData } = await supabase
          .from('grupos_ahorro')
          .select(`
            id, 
            facilitador_id, 
            nombre_grupo, 
            numero_total_miembros,
            tipo_ahorro,
            grupo_juvenil,
            cantidad_hombres,
            cantidad_mujeres,
            cantidad_ninos,
            cantidad_ninas,
            ano_creacion,
            mes_creacion
          `)
          .eq('pais_operacion', directorData.pais_residencia)

        if (!groupsData || groupsData.length === 0) {
          setReports([])
          setGroups([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        // Store groups in state with correct type
        setGroups(groupsData as unknown as Group[])

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
                numero_total_miembros: group.numero_total_miembros,
                tipo_ahorro: group.tipo_ahorro,
                grupo_juvenil: group.grupo_juvenil,
                cantidad_hombres: group.cantidad_hombres,
                cantidad_mujeres: group.cantidad_mujeres,
                cantidad_ninos: group.cantidad_ninos,
                cantidad_ninas: group.cantidad_ninas
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
    // Filter reports for the selected month/year
    const filteredReports = reports.filter(
      r => r.ano === selectedYear && r.mes === selectedMonth
    )

    // Filter groups that existed in the selected month/year
    const activeGroups = groups.filter(g => {
      if (!g.ano_creacion) return false
      if (g.ano_creacion < selectedYear) return true
      if (g.ano_creacion === selectedYear && (g.mes_creacion || 0) <= selectedMonth) return true
      return false
    })

    if (activeGroups.length === 0 && filteredReports.length === 0) {
      return null
    }
    
    // Calculate metrics based on ACTIVE GROUPS (not just reporting groups)
    const totalMembers = activeGroups.reduce((sum, g) => sum + g.numero_total_miembros, 0)
    
    // Financial metrics still come from reports
    const totalAttendance = filteredReports.reduce((sum, r) => sum + (r.promedio_asistencia || 0), 0)
    const totalSavings = filteredReports.reduce((sum, r) => sum + r.cantidad_ahorrada, 0)

    // Group types counts from ACTIVE GROUPS
    const ascaCount = activeGroups.filter(g => g.tipo_ahorro === 'Asca').length
    const roscaCount = activeGroups.filter(g => g.tipo_ahorro === 'Rosca').length
    const simpleCount = activeGroups.filter(g => g.tipo_ahorro === 'Simple').length
    const youthCount = activeGroups.filter(g => g.grupo_juvenil).length

    // Demographics from ACTIVE GROUPS
    const totalMen = activeGroups.reduce((sum, g) => sum + (g.cantidad_hombres || 0), 0)
    const totalWomen = activeGroups.reduce((sum, g) => sum + (g.cantidad_mujeres || 0), 0)
    const totalChildren = activeGroups.reduce((sum, g) => sum + (g.cantidad_ninos || 0) + (g.cantidad_ninas || 0), 0)

    // Savings by type from REPORTS (filtered by month)
    const savingsByType = filteredReports.reduce((acc, r) => {
      if (r.grupos_ahorro) {
        const type = r.grupos_ahorro.tipo_ahorro
        acc[type] = (acc[type] || 0) + r.cantidad_ahorrada
        if (r.grupos_ahorro.grupo_juvenil) {
          acc.youth = (acc.youth || 0) + r.cantidad_ahorrada
        }
      }
      return acc
    }, { Asca: 0, Rosca: 0, Simple: 0, youth: 0 } as { Asca: number; Rosca: number; Simple: number; youth: number })

    return {
      reportCount: filteredReports.length,
      groupCount: activeGroups.length,
      totalMembers,
      totalAttendance,
      totalSavings,
      ascaCount,
      roscaCount,
      simpleCount,
      youthCount,
      totalMen,
      totalWomen,
      totalChildren,
      savingsByType
    }
  }, [reports, groups, selectedYear, selectedMonth])

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">
            Reportes mensuales de {directorCountry}
          </p>
        </div>
        {monthlySummary && (
          <PDFDownloadLink
            document={
              <DirectorReportPDF
                monthlySummary={monthlySummary}
                month={monthNames[selectedMonth - 1]}
                year={selectedYear}
                country={directorCountry}
                directorName={directorName}
              />
            }
            fileName={`Reporte_Mensual_${monthNames[selectedMonth - 1]}_${selectedYear}.pdf`}
          >
            {({ blob, url, loading, error }) => (
              <Button disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {loading ? 'Generando PDF...' : 'Descargar PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      {/* Month/Year Filter */}
      <Card className="border-primary/20 bg-white">
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
            <div className="mt-8 space-y-6 border-t pt-6">
              <div>
                <h3 className="font-semibold mb-4 text-lg">
                  Resumen General - {monthNames[selectedMonth - 1]} {selectedYear}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Reportes
                    </p>
                    <p className="text-2xl font-bold">{monthlySummary.reportCount}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Grupos
                    </p>
                    <p className="text-2xl font-bold">{monthlySummary.groupCount}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Total Miembros
                    </p>
                    <p className="text-2xl font-bold">{monthlySummary.totalMembers}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Promedio Asistencia
                    </p>
                    <p className="text-2xl font-bold">{monthlySummary.totalAttendance}</p>
                  </div>
                  <div className="space-y-1 md:col-span-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Total Ahorrado
                    </p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      ${monthlySummary.totalSavings.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Group Types & Demographics */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Tipos de Grupo</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 p-3 rounded-lg border">
                        <span className="text-xs text-muted-foreground block mb-1">ASCA</span>
                        <span className="text-xl font-bold">{monthlySummary.ascaCount}</span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border">
                        <span className="text-xs text-muted-foreground block mb-1">ROSCA</span>
                        <span className="text-xl font-bold">{monthlySummary.roscaCount}</span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border">
                        <span className="text-xs text-muted-foreground block mb-1">Simple</span>
                        <span className="text-xl font-bold">{monthlySummary.simpleCount}</span>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">Juveniles</span>
                        <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{monthlySummary.youthCount}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Demografía</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-muted/30 rounded-lg border">
                        <span className="text-xs text-muted-foreground block mb-1">Hombres</span>
                        <span className="text-xl font-bold">{monthlySummary.totalMen}</span>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg border">
                        <span className="text-xs text-muted-foreground block mb-1">Mujeres</span>
                        <span className="text-xl font-bold">{monthlySummary.totalWomen}</span>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg border">
                        <span className="text-xs text-muted-foreground block mb-1">Niños/as</span>
                        <span className="text-xl font-bold">{monthlySummary.totalChildren}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Breakdown */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Ahorro por Tipo</h4>
                  <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                    <div className="flex justify-between items-center pb-3 border-b border-dashed">
                      <span className="text-sm">Grupos ASCA</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        ${monthlySummary.savingsByType.Asca.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-dashed">
                      <span className="text-sm">Grupos ROSCA</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        ${monthlySummary.savingsByType.Rosca.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-dashed">
                      <span className="text-sm">Grupos Simple</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        ${monthlySummary.savingsByType.Simple.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Grupos Juveniles</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        ${monthlySummary.savingsByType.youth.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 p-8 bg-muted/30 rounded-lg text-center text-muted-foreground border border-dashed">
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
