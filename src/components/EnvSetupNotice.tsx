import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'

export function EnvSetupNotice() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <Card className="border-l-4 border-l-uncertain">
        <h1 className="mb-2 text-base font-semibold text-fg">{t('setup.title')}</h1>
        <p className="text-sm text-mut">{t('setup.body')}</p>
        <p className="mt-3 text-sm text-mut">{t('setup.docsHint')}</p>
      </Card>
    </div>
  )
}
