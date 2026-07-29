import { create } from 'zustand'

/** Lets the header's "Novo projeto" button (rendered in AppLayout, which
 * every authenticated page shares) open the dialog that actually lives on
 * ProjectsDashboardPage, without threading the state through props across
 * unrelated routes. */
interface CreateProjectDialogState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useCreateProjectDialogStore = create<CreateProjectDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
