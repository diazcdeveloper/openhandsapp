'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  proposito: z.string().min(1, 'El propósito es requerido').max(500, 'El propósito no puede exceder los 500 caracteres'),
})

type FormValues = z.infer<typeof formSchema>

interface UpdatePurposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleId: number
  userId: string
  currentPurpose: string
  onSuccess: () => void
}

export function UpdatePurposeDialog({ 
  open, 
  onOpenChange, 
  cycleId, 
  userId,
  currentPurpose,
  onSuccess
}: UpdatePurposeDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proposito: currentPurpose,
    },
  })

  // Reset form when opening with new data
  useEffect(() => {
    if (open && currentPurpose) {
      form.reset({ proposito: currentPurpose })
    }
  }, [open, currentPurpose, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('participantes_ciclo')
        .update({ proposito_personal: values.proposito })
        .eq('ciclo_id', cycleId)
        .eq('usuario_id', userId)

      if (error) throw error

      toast.success('Propósito actualizado exitosamente')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating purpose:', error)
      toast.error('Error al actualizar el propósito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Actualizar Propósito</DialogTitle>
          <DialogDescription>
            Define o actualiza tu meta personal para este ciclo de ahorro.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="proposito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mi Propósito</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Ahorrar para la educación de mis hijos..."
                      className="min-h-[100px]"
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
                Actualizar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
