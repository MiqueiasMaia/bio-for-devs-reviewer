import { create } from 'zustand'

/** Lets the "Novo projeto" trigger (the sidebar's Reviews accordion) and the
 * dialog it opens (mounted once in `AppShell`, reachable from any route)
 * stay decoupled instead of threading the open state through props. */
interface CreateProjectDialogState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useCreateProjectDialogStore = create<CreateProjectDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
