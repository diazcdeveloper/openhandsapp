'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MapPin, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface Facilitator {
  id: string
  nombre: string
  apellido: string
  email: string
  ciudad_residencia: string
  telefono: string
}

export default function FacilitatorsPage() {
  const { user } = useAuth()
  const [facilitators, setFacilitators] = useState<Facilitator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFacilitators = async () => {
      if (!user) return

      const { data: directorData } = await supabase
        .from('usuarios')
        .select('pais_residencia')
        .eq('id', user.id)
        .single()

      if (!directorData?.pais_residencia) return

      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, ciudad_residencia, telefono')
        .eq('pais_residencia', directorData.pais_residencia)
        .eq('rol', 'facilitador')
        .order('nombre')

      if (data) {
        setFacilitators(data)
      }
      setLoading(false)
    }

    fetchFacilitators()
  }, [user])

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facilitadores</h1>
        <p className="text-muted-foreground">
          Directorio de facilitadores en el país
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {facilitators.map((facilitator) => (
          <Card key={facilitator.id}>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary">
                  {facilitator.nombre[0]}{facilitator.apellido[0]}
                </span>
              </div>
              <div>
                <CardTitle className="text-base">{facilitator.nombre} {facilitator.apellido}</CardTitle>
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {facilitator.ciudad_residencia}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{facilitator.email}</span>
                </div>
                {facilitator.telefono && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{facilitator.telefono}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
