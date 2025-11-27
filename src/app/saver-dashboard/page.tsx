'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { GroupSearchCard } from '@/components/GroupSearchCard'
import { SaverGroupCard } from '@/components/SaverGroupCard'
import { Loader2 } from 'lucide-react'

export default function SaverDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [saverName, setSaverName] = useState<string>('')
  const [cycleId, setCycleId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const checkEnrollment = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('participantes_ciclo')
        .select('ciclo_id')
        .eq('usuario_id', uid)
        .single()

      if (!error && data) {
        setCycleId(data.ciclo_id)
      } else {
        setCycleId(null)
      }
    } catch (error) {
      console.error('Error checking enrollment:', error)
      setCycleId(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Get saver info
      const { data: saverData } = await supabase
        .from('usuarios')
        .select('nombre, apellido')
        .eq('id', user.id)
        .single()

      if (saverData) {
        setSaverName(`${saverData.nombre} ${saverData.apellido}`)
      }

      // Check if saver is enrolled in a cycle
      await checkEnrollment(user.id)
    }

    fetchData()
  }, [])

  const handleJoinSuccess = () => {
    if (userId) {
      checkEnrollment(userId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Ahorrador</h1>
        <p className="text-muted-foreground">
          Bienvenido, {saverName}
        </p>
      </div>

      <div className="max-w-4xl">
        {cycleId && userId ? (
          <SaverGroupCard 
            cycleId={cycleId} 
            userId={userId} 
            onCycleLeft={() => checkEnrollment(userId)} 
          />
        ) : userId ? (
          <GroupSearchCard userId={userId} onJoinSuccess={handleJoinSuccess} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Cargando información del usuario...
          </div>
        )}
      </div>
    </div>
  )
}
