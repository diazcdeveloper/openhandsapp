'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  nombre_grupo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  mes_creacion: z.number().min(1).max(12),
  tipo_ahorro: z.enum(['Simple', 'Rosca', 'Asca']),
  duracion_ciclo: z.number().min(1, 'La duración debe ser al menos 1 mes'),
  numero_total_miembros: z.number().min(0),
  cantidad_hombres: z.number().min(0),
  cantidad_mujeres: z.number().min(0),
  cantidad_ninos: z.number().min(0),
  cantidad_ninas: z.number().min(0),
  ano_creacion: z.number().min(2000).max(2100),
  grupo_juvenil: z.boolean(),
  ciudad_operacion: z.string().min(1, 'La ciudad es requerida'),
  pais_operacion: z.string().min(1, 'El país es requerido'),
})

type FormValues = z.infer<typeof formSchema>;

interface CreateGroupFormProps {
  onSuccess?: () => void;
  initialData?: Partial<FormValues>;
  groupId?: number;
}

export function CreateGroupForm({ onSuccess, initialData, groupId }: CreateGroupFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_grupo: initialData?.nombre_grupo || '',
      mes_creacion: initialData?.mes_creacion || new Date().getMonth() + 1,
      tipo_ahorro: initialData?.tipo_ahorro || 'Simple',
      duracion_ciclo: initialData?.duracion_ciclo || 12,
      numero_total_miembros: initialData?.numero_total_miembros ?? 0,
      cantidad_hombres: initialData?.cantidad_hombres ?? 0,
      cantidad_mujeres: initialData?.cantidad_mujeres ?? 0,
      cantidad_ninos: initialData?.cantidad_ninos ?? 0,
      cantidad_ninas: initialData?.cantidad_ninas ?? 0,
      ano_creacion: initialData?.ano_creacion || new Date().getFullYear(),
      grupo_juvenil: initialData?.grupo_juvenil || false,
      ciudad_operacion: initialData?.ciudad_operacion || '',
      pais_operacion: initialData?.pais_operacion || 'Colombia',
    },
  })

  const paisOperacion = form.watch('pais_operacion')

  const citiesByCountry: Record<string, string[]> = {
    Colombia: ['Barranquilla', 'Arauca'],
    Venezuela: ['Maracaibo', 'Barquisimeto'],
  }

  // Auto-calculate total members
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'cantidad_hombres' || name === 'cantidad_mujeres' || 
          name === 'cantidad_ninos' || name === 'cantidad_ninas') {
        const total = (value.cantidad_hombres || 0) + 
                     (value.cantidad_mujeres || 0) + 
                     (value.cantidad_ninos || 0) + 
                     (value.cantidad_ninas || 0)
        form.setValue('numero_total_miembros', total)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No se encontró el usuario')
        setLoading(false)
        return
      }

      const dataToInsert = {
        ...values,
        facilitador_id: user.id,
        zona_operacion: null,
      }

      let error;

      if (groupId) {
        const { error: updateError } = await supabase
          .from('grupos_ahorro')
          .update(dataToInsert)
          .eq('id', groupId)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('grupos_ahorro')
          .insert(dataToInsert)
        error = insertError
      }

      if (error) {
        console.error('Supabase error:', error)
        toast.error(`Error al ${groupId ? 'actualizar' : 'crear'} el grupo: ` + error.message)
      } else {
        toast.success(`Grupo ${groupId ? 'actualizado' : 'creado'} exitosamente`)
        if (!groupId) form.reset()
        onSuccess?.()
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nombre_grupo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Grupo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Grupo Esperanza" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pais_operacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País de Operación</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un país" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Colombia">Colombia</SelectItem>
                    <SelectItem value="Venezuela">Venezuela</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ciudad_operacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad de Operación</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  key={paisOperacion} // Force re-render when country changes
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una ciudad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(citiesByCountry[paisOperacion] || []).map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo_ahorro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Ahorro</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Simple">Simple</SelectItem>
                    <SelectItem value="Rosca">Rosca</SelectItem>
                    <SelectItem value="Asca">Asca</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duracion_ciclo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración del Ciclo (meses)</FormLabel>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="mes_creacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mes de Creación</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2000, month - 1).toLocaleString('es', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ano_creacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Año de Creación</FormLabel>
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
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Composición del Grupo</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cantidad_hombres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hombres</FormLabel>
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
              name="cantidad_mujeres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mujeres</FormLabel>
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
              name="cantidad_ninos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Niños</FormLabel>
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
              name="cantidad_ninas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Niñas</FormLabel>
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
          </div>

          <FormField
            control={form.control}
            name="numero_total_miembros"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total de Miembros (Calculado automáticamente)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    readOnly
                    className="bg-gray-100"
                  />
                </FormControl>
                <FormDescription>
                  Este valor se calcula automáticamente sumando hombres, mujeres, niños y niñas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="grupo_juvenil"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  ¿Es un grupo juvenil?
                </FormLabel>
                <FormDescription>
                  Marca esta casilla si el grupo está compuesto principalmente por jóvenes
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {groupId ? 'Actualizar Grupo' : 'Crear Grupo'}
        </Button>
      </form>
    </Form>
  )
}
