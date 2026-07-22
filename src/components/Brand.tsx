export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <i className="corner corner--tl" /><i className="corner corner--tr" />
        <i className="corner corner--bl" /><i className="corner corner--br" />
        <b />
      </span>
      {!compact && <span>Cyber<span>X</span>Shot</span>}
    </div>
  )
}
