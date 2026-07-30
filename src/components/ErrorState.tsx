import { useTranslation } from '@/i18n'
import { IconButton } from '@/components/ui/IconButton'
import { RefreshIcon } from '@/components/ui/icons'

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="text-sm font-medium text-red-700">{t('common.error')}</p>
      {onRetry && <IconButton icon={<RefreshIcon />} label={t('common.tryAgain')} onClick={onRetry} />}
    </div>
  )
}
