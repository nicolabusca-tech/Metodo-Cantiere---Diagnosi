import { cn } from '@/lib/utils'
import type { DiagnosiProgresso } from '@/lib/types'

export function DiagnosiProgressoIndicator({
  progresso,
  className,
}: {
  progresso: DiagnosiProgresso | string | undefined | null
  className?: string
}) {
  const p: DiagnosiProgresso = progresso === 'completato' ? 'completato' : 'in corso'
  const done = p === 'completato'

  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      title={p}
    >
      <span
        className={cn(
          'h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background',
          done ? 'bg-emerald-500 ring-emerald-500/35' : 'bg-amber-500 ring-amber-500/35'
        )}
        aria-hidden
      />
      <span className="text-sm font-medium text-neutral-800">{p}</span>
    </span>
  )
}
