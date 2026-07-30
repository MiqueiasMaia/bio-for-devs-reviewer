import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NavState {
  /** When pinned, the sidebar stays expanded (icons + labels). When not
   * pinned, it rests as a ~72px icon-only rail and only expands while the
   * pointer is hovering it (see `Sidebar`'s local `hovering` state). */
  pinned: boolean
  lastProjectId: string | null
  lastModuleByProject: Record<string, string>
  togglePinned: () => void
  setLastProject: (projectId: string) => void
  setLastModule: (projectId: string, moduleId: string) => void
}

/** Persists sidebar pin state + "where was I" per project, same zustand
 * `create` pattern as `createProjectDialogStore.ts`, just with the
 * `persist` middleware (bundled with zustand, no new dependency) so it
 * survives reloads via localStorage. */
export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      pinned: true,
      lastProjectId: null,
      lastModuleByProject: {},
      togglePinned: () => set((s) => ({ pinned: !s.pinned })),
      setLastProject: (projectId) => set({ lastProjectId: projectId }),
      setLastModule: (projectId, moduleId) =>
        set((s) => ({ lastModuleByProject: { ...s.lastModuleByProject, [projectId]: moduleId } })),
    }),
    { name: 'nav-store' },
  ),
)
