import { useMutation } from '@tanstack/react-query'
import { exportProjectBackup, importProjectBackup } from './api'

export function useExportBackup() {
  return useMutation({ mutationFn: (projectId: string) => exportProjectBackup(projectId) })
}

export function useImportBackup() {
  return useMutation({
    mutationFn: (args: Parameters<typeof importProjectBackup>) => importProjectBackup(...args),
  })
}
