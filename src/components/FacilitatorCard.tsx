'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, Mail, Phone, Church, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FacilitatorGroupsModal } from '@/components/FacilitatorGroupsModal'
import { FacilitatorReportsModal } from '@/components/FacilitatorReportsModal'

interface FacilitatorCardProps {
  facilitator: {
    id: string
    nombre: string
    apellido: string
    email: string
    telefono: string | null
    iglesia: string | null
    fecha_nacimiento: string | null
  }
}

export function FacilitatorCard({ facilitator }: FacilitatorCardProps) {
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [showReportsModal, setShowReportsModal] = useState(false)

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {facilitator.nombre[0]}{facilitator.apellido[0]}
            </div>
            {facilitator.nombre} {facilitator.apellido}
          </CardTitle>
          <CardDescription>Facilitador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {facilitator.iglesia && (
              <div className="flex items-center gap-2 text-sm">
                <Church className="h-4 w-4 text-muted-foreground" />
                <span>{facilitator.iglesia}</span>
              </div>
            )}
            {facilitator.fecha_nacimiento && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(facilitator.fecha_nacimiento), "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{facilitator.email}</span>
            </div>
            {facilitator.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{facilitator.telefono}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button 
              onClick={() => setShowGroupsModal(true)}
              variant="outline" 
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Ver Grupos
            </Button>
            <Button 
              onClick={() => setShowReportsModal(true)}
              variant="outline" 
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Reportes
            </Button>
          </div>
        </CardContent>
      </Card>

      <FacilitatorGroupsModal
        open={showGroupsModal}
        onOpenChange={setShowGroupsModal}
        facilitatorId={facilitator.id}
        facilitatorName={`${facilitator.nombre} ${facilitator.apellido}`}
      />

      <FacilitatorReportsModal
        open={showReportsModal}
        onOpenChange={setShowReportsModal}
        facilitatorId={facilitator.id}
        facilitatorName={`${facilitator.nombre} ${facilitator.apellido}`}
      />
    </>
  )
}
