import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-mut">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-line">/</span>}
          {item.to ? (
            <Link to={item.to} className="hover:text-fg">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? 'font-medium text-fg' : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
