import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NavState {
  globalCollapsed: boolean
  lastProjectId: string | null
  lastModuleByProject: Record<string, string>
  toggleGlobalCollapsed: () => void
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
      // Sidebar defaults to expanded (icons + labels, ~260px) so the
      // accordion sub-items are visible out of the box; collapsing to the
      // ~72px icon-only rail is an opt-in power-user toggle.
      globalCollapsed: false,
      lastProjectId: null,
      lastModuleByProject: {},
      toggleGlobalCollapsed: () => set((s) => ({ globalCollapsed: !s.globalCollapsed })),
      setLastProject: (projectId) => set({ lastProjectId: projectId }),
      setLastModule: (projectId, moduleId) =>
        set((s) => ({ lastModuleByProject: { ...s.lastModuleByProject, [projectId]: moduleId } })),
    }),
    { name: 'nav-store' },
  ),
)
