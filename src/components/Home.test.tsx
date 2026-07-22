import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UpdateState } from '../types'
import { Home } from './Home'

afterEach(() => {
  cleanup()
  delete window.cyberxshot
})

describe('Home', () => {
  it('apresenta a ação principal e os recursos essenciais', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /sua tela/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nova captura/i })).toBeInTheDocument()
    expect(screen.getByText('Editor instantâneo')).toBeInTheDocument()
    expect(screen.getByText('Privacidade primeiro')).toBeInTheDocument()
  })

  it('oferece clipboard ou pasta como destino padrão', () => {
    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: /preferências/i }))
    expect(screen.getByText('Destino padrão')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clipboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pasta/i })).toBeInTheDocument()
    expect(screen.getByText('Atualizações')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verificar agora/i })).toBeInTheDocument()
  })

  it('baixa e instala a atualização dentro do aplicativo em um clique', async () => {
    let updateListener: ((state: UpdateState) => void) | undefined
    const downloadUpdate = vi.fn().mockResolvedValue({
      status: 'downloading',
      currentVersion: '0.1.9',
      version: '0.1.10',
      percent: 0,
      manualInstall: false,
    })
    window.cyberxshot = {
      getLaunchAtLogin: vi.fn().mockResolvedValue(false),
      getPlatform: vi.fn().mockResolvedValue('darwin'),
      getCapturePreferences: vi.fn().mockResolvedValue({ destination: 'clipboard', saveDirectory: '' }),
      getUpdateState: vi.fn().mockResolvedValue({ status: 'idle', currentVersion: '0.1.9', manualInstall: false }),
      onUpdateState: vi.fn((callback: (state: UpdateState) => void) => {
        updateListener = callback
        return () => undefined
      }),
      downloadUpdate,
    } as unknown as Window['cyberxshot']

    render(<Home />)
    await waitFor(() => expect(updateListener).toBeDefined())
    updateListener?.({
      status: 'available',
      currentVersion: '0.1.9',
      version: '0.1.10',
      manualInstall: false,
    })

    const updateButton = await screen.findByRole('button', { name: 'Baixar e instalar' })
    fireEvent.click(updateButton)
    await waitFor(() => expect(downloadUpdate).toHaveBeenCalledOnce())
  })
})
