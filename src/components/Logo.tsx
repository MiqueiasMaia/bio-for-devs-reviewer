import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { BioforMark } from './BioforMark'

export function Logo({ size = 'sm', className }: { size?: 'sm' | 'lg'; className?: string }) {
  const { t } = useTranslation()

  return (
    <span className={clsx('inline-flex items-center gap-2 text-include', className)}>
      <BioforMark size={size === 'lg' ? 32 : 20} />
      <span className={clsx('font-mono font-bold tracking-tight text-fg', size === 'lg' ? 'text-xl' : 'text-sm')}>
        {t('common.appName')}
      </span>
    </span>
  )
}
