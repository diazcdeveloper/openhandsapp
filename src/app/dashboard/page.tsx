
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

function WelcomeMessage() {
  const searchParams = useSearchParams()
  const welcome = searchParams.get('welcome')
  
  if (!welcome) return null
  
  return (
    <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
      <CardContent className="flex items-center gap-4 py-6">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        <div>
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
            ¡Usuario creado exitosamente!
          </h2>
          <p className="text-green-700 dark:text-green-400">
            Bienvenido a la plataforma de Fundación Open Hands.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardContent() {
  const [groupCount, setGroupCount] = useState<number | null>(null)

  useEffect(() => {
    const getGroupCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count, error } = await supabase
          .from('grupos_ahorro')
          .select('*', { count: 'exact', head: true })
          .eq('facilitador_id', user.id)
        
        if (!error) {
          setGroupCount(count)
        }
      }
    }
    getGroupCount()
  }, [])

  return (
    <div className="p-8 space-y-8">
      <Suspense fallback={null}>
        <WelcomeMessage />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Grupos Creados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupCount !== null ? groupCount : '-'}</div>
            <p className="text-xs text-muted-foreground">
              Total de grupos registrados
            </p>
          </CardContent>
        </Card>
        {/* Add more cards as needed */}
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Bienvenido al Dashboard</h2>
        <p className="text-muted-foreground">
          Selecciona una opción del menú lateral para comenzar.
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}
