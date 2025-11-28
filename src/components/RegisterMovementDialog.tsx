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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  monto: z.number().min(0, 'El monto no puede ser negativo'),
  nota: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Movement {
  id: number
  fecha: string
  monto: number
  nota: string | null
}

interface RegisterMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleId: number
  userId: string
  onSuccess: () => void
  initialData?: Movement
}

export function RegisterMovementDialog({ 
  open, 
  onOpenChange, 
  cycleId, 
  userId,
  onSuccess,
  initialData
}: RegisterMovementDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: initialData?.fecha || new Date().toISOString().split('T')[0],
      monto: initialData?.monto || (initialData?.monto === 0 ? 0 : undefined),
      nota: initialData?.nota || '',
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          fecha: initialData.fecha,
          monto: initialData.monto,
          nota: initialData.nota || '',
        })
      } else {
        form.reset({
          fecha: new Date().toISOString().split('T')[0],
          monto: undefined,
          nota: '',
        })
      }
    }
  }, [open, initialData, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const movementData = {
        ciclo_id: cycleId,
        usuario_id: userId,
        fecha: values.fecha,
        monto: values.monto,
        nota: values.nota || null,
      }

      let error

      if (initialData) {
        // Update existing movement
        const { error: updateError } = await supabase
          .from('movimientos_ahorro')
          .update(movementData)
          .eq('id', initialData.id)
        error = updateError
      } else {
        // Create new movement
        const { error: insertError } = await supabase
          .from('movimientos_ahorro')
          .insert(movementData)
        error = insertError
      }

      if (error) throw error

      toast.success(initialData ? 'Movimiento actualizado' : 'Movimiento registrado exitosamente')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving movement:', error)
      toast.error('Error al guardar el movimiento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Aporte de Reunión' : 'Registrar Aporte de Reunión'}
          </DialogTitle>
          <DialogDescription>
            {initialData ? 'Actualiza' : 'Ingresa'} los detalles de tu aporte en la reunión
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto Ahorrado</FormLabel>
                  <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? undefined : parseFloat(val))
                        }}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nota"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Agrega notas sobre este ahorro..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
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
                {initialData ? 'Actualizar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
