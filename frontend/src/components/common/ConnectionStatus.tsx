// Indicador do estado da ligação Socket.io em tempo real — torna visível
// quando a app está sincronizada com o servidor e quando a ligação caiu.

import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import SocketService from '@/services/socket'
import { cn } from '@/utils/cn'

export function ConnectionStatus(): ReactElement {
  const [isConnected, setIsConnected] = useState(SocketService.isConnected())

  useEffect(() => {
    setIsConnected(SocketService.isConnected())
    return SocketService.onConnectionChange(setIsConnected)
  }, [])

  return (
    <div
      className="flex items-center gap-2 text-xs text-cw-text-secondary"
      title={
        isConnected ? 'Ligado em tempo real' : 'Ligação perdida — a tentar reconectar'
      }
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          isConnected ? 'bg-cw-wave animate-wave-pulse' : 'bg-cw-danger'
        )}
      />
      {isConnected ? 'Em direto' : 'Ligação perdida'}
    </div>
  )
}
