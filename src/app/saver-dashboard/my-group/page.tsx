'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export default function MyGroupPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = () => {
    // Funcionalidad pendiente
    console.log('Buscando grupo:', searchQuery)
  }

  return (
    <div className="p-8 pt-20 md:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Grupo</h1>
        <p className="text-muted-foreground">
          Busca el nombre de tu grupo de ahorro para unirte
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Buscar Grupo de Ahorro</CardTitle>
          <CardDescription>
            Ingresa el nombre del grupo al que deseas unirte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupSearch">Nombre del Grupo</Label>
            <div className="flex gap-2">
              <Input
                id="groupSearch"
                type="text"
                placeholder="Ej: Grupo Esperanza"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Funcionalidad de búsqueda pendiente de implementación
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-8">
            <div className="text-center space-y-2">
              <div className="text-4xl">🔍</div>
              <p className="text-sm text-muted-foreground">
                Ingresa el nombre del grupo para comenzar la búsqueda
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
