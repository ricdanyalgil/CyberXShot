import { useEffect, useState } from 'react'
import {
  Aperture,
  ArrowUpRight,
  Check,
  Cloud,
  Copy,
  Keyboard,
  MonitorUp,
  Moon,
  MousePointer2,
  PenTool,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Brand } from './Brand'

const features = [
  { icon: MousePointer2, title: 'Seleção precisa', text: 'Arraste sobre qualquer área da tela e capture exatamente o que importa.' },
  { icon: PenTool, title: 'Editor instantâneo', text: 'Setas, formas, desenho, destaque, texto e desfoque sem trocar de aplicativo.' },
  { icon: Copy, title: 'Copie ou salve', text: 'Envie direto para a área de transferência ou exporte em PNG.' },
  { icon: Cloud, title: 'Link em segundos', text: 'Compartilhe por um link público temporário, somente quando você decidir.' },
  { icon: Search, title: 'Pesquisa visual', text: 'Abra sua seleção no Google Lens para encontrar imagens semelhantes.' },
  { icon: ShieldCheck, title: 'Privacidade primeiro', text: 'Capturas ficam locais até você acionar o compartilhamento.' },
]

export function Home() {
  const [launchAtLogin, setLaunchAtLogin] = useState(false)
  const [platform, setPlatform] = useState('desktop')
  const [activeNav, setActiveNav] = useState<'home' | 'settings'>('home')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    window.cyberxshot?.getLaunchAtLogin().then(setLaunchAtLogin).catch(() => undefined)
    window.cyberxshot?.getPlatform().then(setPlatform).catch(() => undefined)
  }, [])

  async function capture() {
    setStarting(true)
    try {
      if (window.cyberxshot) await window.cyberxshot.startCapture()
      else window.alert('Abra o CyberXShot pelo aplicativo desktop para capturar a tela.')
    } finally {
      setStarting(false)
    }
  }

  async function toggleLaunch() {
    const next = !launchAtLogin
    setLaunchAtLogin(next)
    try {
      const confirmed = await window.cyberxshot?.setLaunchAtLogin(next)
      if (typeof confirmed === 'boolean') setLaunchAtLogin(confirmed)
    } catch {
      setLaunchAtLogin(!next)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav>
          <button className={activeNav === 'home' ? 'active' : ''} onClick={() => setActiveNav('home')}>
            <Aperture size={19} /> Capturar
          </button>
          <button className={activeNav === 'settings' ? 'active' : ''} onClick={() => setActiveNav('settings')}>
            <Settings2 size={19} /> Preferências
          </button>
        </nav>
        <div className="sidebar-tip">
          <Sparkles size={17} />
          <p><strong>Dica rápida</strong>O app continua disponível na bandeja mesmo com esta janela fechada.</p>
        </div>
        <div className="powered-by">
          Powered by
          <strong>The Danyalgil Company</strong>
          <span>&amp; CyberX</span>
        </div>
        <div className="version">CyberXShot v0.1.4</div>
      </aside>

      <main className="dashboard">
        {activeNav === 'home' ? (
          <>
            <header className="dashboard-header">
              <span className="status"><i /> Pronto para capturar</span>
              <span className="platform">{platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Desktop'}</span>
            </header>

            <section className="hero">
              <div className="eyebrow"><ShieldCheck size={15} /> rápido, leve e privado</div>
              <h1>Sua tela. Sua ideia.<br /><span>Capture no instante.</span></h1>
              <p>Selecione, anote e compartilhe qualquer parte da tela sem interromper o seu fluxo.</p>
              <div className="hero-actions">
                <button className="capture-button" onClick={capture} disabled={starting}>
                  <Aperture size={22} /> {starting ? 'Abrindo…' : 'Nova captura'}
                </button>
                <div className="shortcut"><Keyboard size={18} /><kbd>{platform === 'darwin' ? '⌘' : 'Ctrl'}</kbd><b>+</b><kbd>Shift</kbd><b>+</b><kbd>X</kbd></div>
              </div>
            </section>

            <section className="feature-grid">
              {features.map(({ icon: Icon, title, text }) => (
                <article key={title}>
                  <span className="feature-icon"><Icon size={21} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </section>

            <footer className="privacy-line">
              <ShieldCheck size={16} /> Nada sai do seu computador sem sua ação.
              <button onClick={() => window.cyberxshot?.openExternal('https://github.com/ricdanyalgil/CyberXShot')}>Código aberto <ArrowUpRight size={14} /></button>
            </footer>
          </>
        ) : (
          <section className="settings-page">
            <div className="eyebrow"><Settings2 size={15} /> preferências</div>
            <h1>Do seu jeito.</h1>
            <p className="settings-lead">Ajustes simples para deixar a captura sempre a um atalho de distância.</p>
            <div className="settings-card">
              <div className="setting-icon"><MonitorUp size={22} /></div>
              <div><strong>Iniciar com o sistema</strong><span>Deixa o CyberXShot pronto na bandeja ao entrar.</span></div>
              <button role="switch" aria-checked={launchAtLogin} className={`switch ${launchAtLogin ? 'on' : ''}`} onClick={toggleLaunch}><i /></button>
            </div>
            <div className="settings-card">
              <div className="setting-icon"><Keyboard size={22} /></div>
              <div><strong>Atalho global</strong><span>Disponível em qualquer aplicativo.</span></div>
              <div className="shortcut compact"><kbd>{platform === 'darwin' ? '⌘' : 'Ctrl'}</kbd><b>+</b><kbd>Shift</kbd><b>+</b><kbd>X</kbd></div>
            </div>
            <div className="settings-card">
              <div className="setting-icon"><Moon size={22} /></div>
              <div><strong>Tema escuro</strong><span>Interface otimizada para não disputar atenção com sua tela.</span></div>
              <span className="fixed-choice"><Check size={14} /> Ativo</span>
            </div>
            <div className="privacy-box"><ShieldCheck size={22} /><div><strong>Compartilhamento consciente</strong><p>Ao criar um link ou pesquisar por imagem, a seleção é enviada para um serviço público temporário e removida após 1 hora.</p></div></div>
          </section>
        )}
      </main>
    </div>
  )
}
