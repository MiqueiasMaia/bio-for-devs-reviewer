import { Link } from 'react-router-dom'
import clsx from 'clsx'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-mut">
      {items.map((item, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <span className="shrink-0 text-line">/</span>}
          {item.to ? (
            <Link to={item.to} title={item.label} className="min-w-0 max-w-[220px] truncate hover:text-fg">
              {item.label}
            </Link>
          ) : (
            <span
              title={item.label}
              className={clsx('min-w-0 max-w-[220px] truncate', i === items.length - 1 && 'font-medium text-fg')}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
