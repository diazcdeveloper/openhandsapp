'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellido: z.string().min(2, 'El apellido es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  pais: z.string().min(2, 'El país es requerido'),
  ciudad: z.string().min(2, 'La ciudad es requerida'),
  iglesia: z.string().optional(),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  telefono: z.string().min(5, 'El teléfono es requerido'),
  nueva_contrasena: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface UpdateProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'Colombia': ['Barranquilla', 'Arauca'],
  'Venezuela': ['Maracaibo', 'Barquisimeto']
}

export function UpdateProfileDialog({ open, onOpenChange, userId }: UpdateProfileDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormValues | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      pais: '',
      ciudad: '',
      iglesia: '',
      fecha_nacimiento: '',
      telefono: '',
    },
  })

  const selectedCountry = form.watch('pais')

  // Reset city when country changes
  useEffect(() => {
    if (selectedCountry) {
      const currentCity = form.getValues('ciudad')
      const validCities = CITIES_BY_COUNTRY[selectedCountry] || []
      if (currentCity && !validCities.includes(currentCity)) {
        form.setValue('ciudad', '')
      }
    }
  }, [selectedCountry, form])

  useEffect(() => {
    if (open && userId) {
      loadUserData()
    }
  }, [open, userId])

  const loadUserData = async () => {
    setFetching(true)
    try {
      // Get auth user for email
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      // Get profile data
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        form.reset({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          email: user?.email || '',
          pais: data.pais_residencia || data.pais_operacion || '',
          ciudad: data.ciudad_residencia || '',
          iglesia: data.iglesia || '',
          fecha_nacimiento: data.fecha_nacimiento || '',
          telefono: data.telefono || '',
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Error al cargar datos del usuario')
    } finally {
      setFetching(false)
    }
  }

  const handleFormSubmit = (values: FormValues) => {
    console.log('Form submitted with values:', { ...values, nueva_contrasena: values.nueva_contrasena ? '***' : '' })
    
    // If password is being changed, show confirmation modal
    if (values.nueva_contrasena && values.nueva_contrasena.trim().length > 0) {
      console.log('Password change detected, showing confirmation modal')
      setPendingFormData(values)
      setShowPasswordConfirmation(true)
    } else {
      console.log('No password change, proceeding with normal update')
      performUpdate(values, false)
    }
  }

  const handlePasswordConfirmation = async () => {
    console.log('Password change confirmed')
    setShowPasswordConfirmation(false)
    
    if (pendingFormData) {
      console.log('Proceeding with password update')
      await performUpdate(pendingFormData, true)
      setPendingFormData(null)
    } else {
      console.error('No pending form data found')
    }
  }

  async function performUpdate(values: FormValues, isPasswordChange: boolean = false) {
    console.log('performUpdate called, isPasswordChange:', isPasswordChange)
    setLoading(true)
    
    try {
      // 1. Update Profile Data
      console.log('Updating profile data...')
      const updateData = {
        nombre: values.nombre,
        apellido: values.apellido,
        pais_residencia: values.pais,
        pais_operacion: values.pais,
        ciudad_residencia: values.ciudad,
        zona_coordinacion: values.ciudad,
        iglesia: values.iglesia || 'no asiste',
        fecha_nacimiento: values.fecha_nacimiento,
        telefono: values.telefono,
        email: values.email
      }

      const { error: profileError } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', userId)

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw new Error(`Error al actualizar perfil: ${profileError.message}`)
      }
      console.log('Profile updated successfully')

      // 2. Update Email if changed
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email !== values.email) {
        console.log('Email changed, updating...')
        const { error: emailError } = await supabase.auth.updateUser({ 
          email: values.email 
        })
        
        if (emailError) {
          console.error('Email update error:', emailError)
          toast.warning('Perfil actualizado, pero hubo un error al actualizar el correo: ' + emailError.message)
        } else {
          console.log('Email updated successfully')
          toast.info('Se ha enviado un correo de confirmación a la nueva dirección.')
        }
      }

      // 3. Update Password if provided
      let passwordUpdated = false
      if (values.nueva_contrasena && values.nueva_contrasena.trim().length > 0) {
        console.log('Attempting to update password...')
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: values.nueva_contrasena.trim()
        })

        if (passwordError) {
          console.error('Fallo al cambiar la contraseña:', passwordError.message)
          toast.error('Error al cambiar la contraseña: ' + passwordError.message)
          setLoading(false)
          return
        } else {
          console.log('Password updated successfully')
          passwordUpdated = true
        }
      }

      // Show appropriate success message and handle post-update flow
      if (passwordUpdated) {
        console.log('Password was updated, signing out and redirecting to login...')
        toast.success('Contraseña actualizada. Cerrando sesión...')
        
        // 1. Cierre de sesión (signOut)
        const { error: signOutError } = await supabase.auth.signOut()
        
        if (signOutError) {
          console.error('Fallo al cerrar sesión:', signOutError.message)
        }
        
        console.log('User signed out')
        
        // 2. Redirección al login
        console.log('Redirecting to login...')
        router.push('/login')
      } else {
        console.log('Profile updated without password change')
        toast.success('Perfil actualizado exitosamente')
        onOpenChange(false)
        form.reset()
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error in performUpdate:', error)
      toast.error(error.message || 'Error al actualizar el perfil')
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar Mis Datos</DialogTitle>
          <DialogDescription>
            Si cambiaste tu contraseña, cierra la ventana y vuelve a iniciar sesión con tu nueva contraseña.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedCountry}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una ciudad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedCountry && CITIES_BY_COUNTRY[selectedCountry]?.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="iglesia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Iglesia (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Si no asiste, dejar en blanco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha_nacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nueva_contrasena"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password" 
                        placeholder="Dejar en blanco para no cambiar"
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
                  Actualizar Datos
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>

    {/* Password Confirmation Modal */}
    <AlertDialog open={showPasswordConfirmation} onOpenChange={setShowPasswordConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar cambio de contraseña?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de cambiar tu contraseña. Asegúrate de recordar la nueva contraseña, ya que la necesitarás para futuros inicios de sesión.
            <br /><br />
            ¿Deseas continuar con este cambio?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowPasswordConfirmation(false)
            setPendingFormData(null)
          }}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handlePasswordConfirmation}>
            Sí, cambiar contraseña
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
