'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from "sonner"

interface Group {
  id: number
  nombre_grupo: string
  numero_total_miembros: number
}

interface CreateReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  userId: string | null
  initialData?: Partial<FormValues>
  reportId?: number
}

const formSchema = z.object({
  grupo_id: z.string().min(1, 'Debes seleccionar un grupo'),
  ano: z.number().min(2020, 'Año inválido').max(2100, 'Año inválido'),
  mes: z.number().min(1, 'Mes debe ser entre 1 y 12').max(12, 'Mes debe ser entre 1 y 12'),
  numero_reuniones: z.number().min(0, 'Debe ser un número positivo'),
  promedio_asistencia: z.number().min(0, 'Debe ser un número positivo'),
  cantidad_ahorrada: z.number().min(0, 'Debe ser un número positivo'),
  comentarios: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function CreateReportDialog({ open, onOpenChange, onSuccess, userId, initialData, reportId }: CreateReportDialogProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grupo_id: initialData?.grupo_id || '',
      ano: initialData?.ano || new Date().getFullYear(),
      mes: initialData?.mes || new Date().getMonth() + 1,
      numero_reuniones: initialData?.numero_reuniones || (initialData?.numero_reuniones === 0 ? 0 : undefined),
      promedio_asistencia: initialData?.promedio_asistencia || (initialData?.promedio_asistencia === 0 ? 0 : undefined),
      cantidad_ahorrada: initialData?.cantidad_ahorrada || (initialData?.cantidad_ahorrada === 0 ? 0 : undefined),
      comentarios: initialData?.comentarios || '',
    },
  })

  useEffect(() => {
    const fetchGroups = async () => {
      if (!userId) return

      const { data, error } = await supabase
        .from('grupos_ahorro')
        .select('id, nombre_grupo, numero_total_miembros')
        .eq('facilitador_id', userId)
        .order('nombre_grupo')

      if (!error && data) {
        setGroups(data)
      }
    }

    if (open) {
      fetchGroups()
      // Reset form with initial data when dialog opens
      if (initialData) {
        form.reset({
          grupo_id: initialData.grupo_id || '',
          ano: initialData.ano || new Date().getFullYear(),
          mes: initialData.mes || new Date().getMonth() + 1,
          numero_reuniones: initialData.numero_reuniones || (initialData.numero_reuniones === 0 ? 0 : undefined),
          promedio_asistencia: initialData.promedio_asistencia || (initialData.promedio_asistencia === 0 ? 0 : undefined),
          cantidad_ahorrada: initialData.cantidad_ahorrada || (initialData.cantidad_ahorrada === 0 ? 0 : undefined),
          comentarios: initialData.comentarios || '',
        })
      }
    }
  }, [open, userId, initialData, form])

  const onSubmit = async (values: FormValues) => {
    if (!userId) {
      toast.error('Error', {
        description: 'No se pudo identificar el usuario',
      })
      return
    }

    setLoading(true)

    try {
      const reportData = {
        facilitador_id: userId,
        grupo_id: parseInt(values.grupo_id),
        mes: values.mes,
        ano: values.ano,
        numero_reuniones: values.numero_reuniones,
        promedio_asistencia: values.promedio_asistencia,
        cantidad_ahorrada: values.cantidad_ahorrada,
        comentarios: values.comentarios || null,
      }

      let error

      if (reportId) {
        // Update existing report
        const { error: updateError } = await supabase
          .from('reportes_grupos')
          .update(reportData)
          .eq('id', reportId)
        error = updateError
      } else {
        // Create new report
        const { error: insertError } = await supabase
          .from('reportes_grupos')
          .insert(reportData)
        error = insertError
      }

      if (error) throw error

      toast.success(reportId ? 'Reporte actualizado' : 'Reporte creado', {
        description: `El reporte mensual ha sido ${reportId ? 'actualizado' : 'creado'} exitosamente`,
      })

      if (!reportId) form.reset()
      onSuccess()
    } catch (error) {
      console.error('Error creating/updating report:', error)
      toast.error('Error', {
        description: `No se pudo ${reportId ? 'actualizar' : 'crear'} el reporte. Por favor intenta de nuevo.`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{reportId ? 'Editar Reporte Mensual' : 'Crear Reporte Mensual'}</DialogTitle>
          <DialogDescription>
            {reportId ? 'Actualiza' : 'Completa'} la información del reporte mensual del grupo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="grupo_id"
              render={({ field }) => {
                const selectedGroup = groups.find(g => g.id.toString() === field.value)
                
                return (
                  <FormItem>
                    <FormLabel>Grupo de Ahorro</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.nombre_grupo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedGroup && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Total Miembros: {selectedGroup.numero_total_miembros || 0}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mes</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona mes" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Enero</SelectItem>
                        <SelectItem value="2">Febrero</SelectItem>
                        <SelectItem value="3">Marzo</SelectItem>
                        <SelectItem value="4">Abril</SelectItem>
                        <SelectItem value="5">Mayo</SelectItem>
                        <SelectItem value="6">Junio</SelectItem>
                        <SelectItem value="7">Julio</SelectItem>
                        <SelectItem value="8">Agosto</SelectItem>
                        <SelectItem value="9">Septiembre</SelectItem>
                        <SelectItem value="10">Octubre</SelectItem>
                        <SelectItem value="11">Noviembre</SelectItem>
                        <SelectItem value="12">Diciembre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="numero_reuniones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Reuniones</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="promedio_asistencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promedio de Asistencia</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cantidad_ahorrada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad Ahorrada</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comentarios"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Agrega comentarios sobre el mes..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Reporte
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
