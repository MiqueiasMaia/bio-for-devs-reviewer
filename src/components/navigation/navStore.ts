import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NavState {
  globalCollapsed: boolean
  contextualCollapsed: boolean
  lastProjectId: string | null
  lastModuleByProject: Record<string, string>
  toggleGlobalCollapsed: () => void
  toggleContextualCollapsed: () => void
  setLastProject: (projectId: string) => void
  setLastModule: (projectId: string, moduleId: string) => void
}

/** Persists sidebar collapse state + "where was I" per project, same
 * zustand `create` pattern as `createProjectDialogStore.ts`, just with the
 * `persist` middleware (bundled with zustand, no new dependency) so it
 * survives reloads via localStorage. */
export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      // Global rail defaults to compact/icon-only (~72px, the spec's baseline
      // width); Contextual sidebar defaults to fully expanded (280px).
      globalCollapsed: true,
      contextualCollapsed: false,
      lastProjectId: null,
      lastModuleByProject: {},
      toggleGlobalCollapsed: () => set((s) => ({ globalCollapsed: !s.globalCollapsed })),
      toggleContextualCollapsed: () => set((s) => ({ contextualCollapsed: !s.contextualCollapsed })),
      setLastProject: (projectId) => set({ lastProjectId: projectId }),
      setLastModule: (projectId, moduleId) =>
        set((s) => ({ lastModuleByProject: { ...s.lastModuleByProject, [projectId]: moduleId } })),
    }),
    { name: 'nav-store' },
  ),
)
