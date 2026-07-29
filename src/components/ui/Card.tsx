import { type HTMLAttributes } from 'react'
import clsx from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('border border-line bg-white p-6', className)}
      {...props}
    />
  )
}
