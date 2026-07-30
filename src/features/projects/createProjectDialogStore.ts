import { create } from 'zustand'

/** Lets the "Novo projeto" trigger and the dialog it opens (both on
 * ProjectsDashboardPage today) stay decoupled, in case another entry point
 * needs to open the same dialog later. */
interface CreateProjectDialogState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useCreateProjectDialogStore = create<CreateProjectDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
