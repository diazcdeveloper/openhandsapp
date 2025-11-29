'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, PiggyBank, FileText, Users } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { toast } from 'sonner'

export default function DirectorReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [reportData, setReportData] = useState<{
    totalSaved: number
    reportsCount: number
    groupsReporting: number
  } | null>(null)

  const handleSearch = async () => {
    if (!user) return
    setLoading(true)

    try {
      // Get director's country
      const { data: directorData } = await supabase
        .from('usuarios')
        .select('pais_residencia')
        .eq('id', user.id)
        .single()

      if (!directorData?.pais_residencia) {
        toast.error('No se pudo determinar el país de operación')
        return
      }

      // Get all groups in the country
      const { data: groups } = await supabase
        .from('grupos_ahorro')
        .select('id')
        .eq('pais_operacion', directorData.pais_residencia)

      const groupIds = groups?.map(g => g.id) || []

      if (groupIds.length === 0) {
        setReportData({ totalSaved: 0, reportsCount: 0, groupsReporting: 0 })
        return
      }

      // Get reports filtered by year, month and groups
      const { data: reports } = await supabase
        .from('reportes_grupos')
        .select('cantidad_ahorrada, grupo_id')
        .in('grupo_id', groupIds)
        .eq('ano', parseInt(year))
        .eq('mes', parseInt(month))

      if (reports) {
        const totalSaved = reports.reduce((sum, r) => sum + (r.cantidad_ahorrada || 0), 0)
        const uniqueGroups = new Set(reports.map(r => r.grupo_id)).size

        setReportData({
          totalSaved,
          reportsCount: reports.length,
          groupsReporting: uniqueGroups
        })
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Error al buscar reportes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes Nacionales</h1>
        <p className="text-muted-foreground">
          Consulta el ahorro consolidado por periodo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrar Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-48 space-y-2">
              <label className="text-sm font-medium">Año</label>
              <Input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                min={2020}
                max={2100}
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona mes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(2000, m - 1).toLocaleString('es', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={loading} className="w-full md:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Ahorrado</CardTitle>
              <PiggyBank className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                ${reportData.totalSaved.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-green-600/80 dark:text-green-400/80">
                En {new Date(2000, parseInt(month) - 1).toLocaleString('es', { month: 'long' })} {year}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reportes Recibidos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.reportsCount}</div>
              <p className="text-xs text-muted-foreground">
                Documentos procesados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grupos Reportando</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.groupsReporting}</div>
              <p className="text-xs text-muted-foreground">
                Grupos únicos
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
