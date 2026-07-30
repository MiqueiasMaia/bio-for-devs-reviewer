import { useEffect, useMemo } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { useProject } from '@/features/projects/hooks'
import { Footer } from '@/components/Footer'
import { Sidebar } from '@/components/navigation/Sidebar'
import { Breadcrumb, type BreadcrumbItem } from '@/components/navigation/Breadcrumb'
import { findModule, moduleIdForPath, resolveModuleItems } from '@/components/navigation/navConfig'
import { useNavStore } from '@/components/navigation/navStore'
import { useCreateProjectDialogStore } from '@/features/projects/createProjectDialogStore'
import { CreateProjectDialog } from '@/features/projects/CreateProjectDialog'

function relativePath(pathname: string, projectId: string) {
  return pathname.replace(new RegExp(`^/projects/${projectId}/?`), '')
}

export function AppShell() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const { data: project } = useProject(projectId)
  const setLastProject = useNavStore((s) => s.setLastProject)
  const setLastModule = useNavStore((s) => s.setLastModule)
  const wizardOpen = useCreateProjectDialogStore((s) => s.open)
  const setWizardOpen = useCreateProjectDialogStore((s) => s.setOpen)

  const relPath = projectId ? relativePath(location.pathname, projectId) : ''
  const activeModuleId = projectId ? moduleIdForPath(relPath) : 'reviews'
  const isOwner = Boolean(project && user && project.ownerId === user.id)
  const activeModule = findModule(activeModuleId)

  useEffect(() => {
    if (projectId) {
      setLastProject(projectId)
      setLastModule(projectId, activeModuleId)
    }
  }, [projectId, activeModuleId, setLastProject, setLastModule])

  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: t('sidebar.reviews'), to: '/projects' }]
    if (!project || !activeModule) return items
    items.push({ label: project.name, to: `/projects/${project.id}` })

    const ctx = { project, isOwner }
    const currentItem = resolveModuleItems(activeModule, ctx).find((i) => i.to === relPath)
    const currentLabel = currentItem ? t(currentItem.labelKey as TranslationKey) : t(activeModule.labelKey as TranslationKey)
    items.push({ label: currentLabel })
    return items
  }, [project, activeModule, relPath, isOwner, t])

  return (
    // Fixed to exactly the viewport height with overflow hidden — the two
    // columns below manage their own scrolling independently instead of
    // letting the document itself grow/scroll. Without this, a tall sidebar
    // (many expanded modules) or a tall workspace page would stretch the
    // whole page rather than scrolling in place.
    <div className="flex h-screen overflow-hidden">
      <Sidebar projectId={projectId} project={project} isOwner={isOwner} activeModuleId={activeModuleId} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {project && (
          <div className="border-b border-line px-6 py-3">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        )}
        <main className="w-full flex-1 px-6 py-8">
          <Outlet />
        </main>
        <Footer />
      </div>
      <CreateProjectDialog open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}
