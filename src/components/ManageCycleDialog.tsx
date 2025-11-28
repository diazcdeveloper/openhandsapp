'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ActiveCycleInfoDialog } from './ActiveCycleInfoDialog'
import { Loader2, Info } from 'lucide-react'

const formSchema = z.object({
  nombre_ciclo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fecha_fin: z.string().optional(),
  estado: z.enum(['activo', 'terminado']),
})

type FormValues = z.infer<typeof formSchema>

interface Cycle {
  id: number
  nombre_ciclo: string
  fecha_inicio: string
  fecha_fin?: string | null
  estado: 'activo' | 'terminado'
}

interface ManageCycleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  groupName: string
  existingCycle?: Cycle | null
  onSuccess?: () => void
}

export function ManageCycleDialog({ 
  open, 
  onOpenChange, 
  groupId, 
  groupName,
  existingCycle,
  onSuccess 
}: ManageCycleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_ciclo: existingCycle?.nombre_ciclo || '',
      fecha_inicio: existingCycle?.fecha_inicio || '',
      fecha_fin: existingCycle?.fecha_fin || '',
      estado: existingCycle?.estado || 'activo',
    },
  })

  // Reset form when existing cycle changes
  useEffect(() => {
    if (existingCycle) {
      form.reset({
        nombre_ciclo: existingCycle.nombre_ciclo,
        fecha_inicio: existingCycle.fecha_inicio,
        fecha_fin: existingCycle.fecha_fin || '',
        estado: existingCycle.estado,
      })
    } else {
      form.reset({
        nombre_ciclo: '',
        fecha_inicio: '',
        fecha_fin: '',
        estado: 'activo',
      })
    }
  }, [existingCycle, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No se encontró el usuario')
        setLoading(false)
        return
      }

      const cycleData = {
        grupo_id: groupId,
        nombre_ciclo: values.nombre_ciclo,
        fecha_inicio: values.fecha_inicio,
        fecha_fin: values.fecha_fin || null,
        estado: values.estado,
        creado_por: user.id,
      }

      let error;

      if (existingCycle) {
        // Update existing cycle
        const { error: updateError } = await supabase
          .from('ciclos_ahorro')
          .update(cycleData)
          .eq('id', existingCycle.id)
        error = updateError
      } else {
        // Create new cycle
        const { error: insertError } = await supabase
          .from('ciclos_ahorro')
          .insert(cycleData)
        error = insertError
      }

      if (error) {
        console.error('Supabase error:', error)
        toast.error(`Error al ${existingCycle ? 'actualizar' : 'crear'} el ciclo: ` + error.message)
      } else {
        toast.success(`Ciclo ${existingCycle ? 'actualizado' : 'creado'} exitosamente`)
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {existingCycle ? 'Gestionar Ciclo de Ahorro' : 'Crear Ciclo de Ahorro'}
            </DialogTitle>
            <DialogDescription>
              {existingCycle 
                ? `Actualiza el ciclo de ahorro para ${groupName}` 
                : `Crea un nuevo ciclo de ahorro para ${groupName}`
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_ciclo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Ciclo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Ciclo 2025-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecha_fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado del Ciclo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="terminado">Terminado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2 pt-4">
                {existingCycle && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowInfoDialog(true)}
                    className="w-full"
                  >
                    <Info className="mr-2 h-4 w-4" />
                    Info del Ciclo
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {existingCycle ? 'Actualizar' : 'Crear'} Ciclo
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {existingCycle && (
        <ActiveCycleInfoDialog
          open={showInfoDialog}
          onOpenChange={setShowInfoDialog}
          cycleId={existingCycle.id}
          groupName={groupName}
        />
      )}
    </>
  )
}
