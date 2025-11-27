'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Loader2 } from 'lucide-react'
import { FacilitatorCard } from '@/components/FacilitatorCard'

interface Facilitator {
  id: string
  nombre: string
  apellido: string
  email: string
  ciudad_residencia: string
  telefono: string | null
  iglesia: string | null
  fecha_nacimiento: string | null
}

export default function FacilitatorsPage() {
  const [facilitators, setFacilitators] = useState<Facilitator[]>([])
  const [loading, setLoading] = useState(true)
  const [coordinatorZone, setCoordinatorZone] = useState<string>('')

  useEffect(() => {
    const loadFacilitators = async () => {
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

        // Get facilitators in the same zone
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nombre, apellido, email, ciudad_residencia, telefono, iglesia, fecha_nacimiento')
          .eq('rol', 'facilitador')
          .eq('ciudad_residencia', coordinatorData.zona_coordinacion)
          .order('nombre', { ascending: true })

        if (error) {
          console.error('Error loading facilitators:', error)
        } else {
          setFacilitators(data || [])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFacilitators()
  }, [])

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facilitadores</h1>
          <p className="text-muted-foreground">
            Facilitadores en tu zona: {coordinatorZone}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : facilitators.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay facilitadores registrados en tu zona
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {facilitators.map((facilitator) => (
            <FacilitatorCard
              key={facilitator.id}
              facilitator={facilitator}
            />
          ))}
        </div>
      )}
    </div>
  )
}
