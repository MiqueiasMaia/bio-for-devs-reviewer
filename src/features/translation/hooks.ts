import { useMutation } from '@tanstack/react-query'
import { translateRecord } from './api'

export function useTranslateRecord() {
  return useMutation({
    mutationFn: (record: { id: string; title: string; abstract: string | null }) => translateRecord(record),
  })
}
