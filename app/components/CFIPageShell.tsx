import Link from 'next/link'

type CFILink = {
  href: string
  label: string
}

export default function CFIPageShell({
  title,
  description,
  backLinks = [],
  actions,
  maxWidthClassName = 'max-w-6xl',
  children,
}: {
  title: string
  description?: string
  backLinks?: CFILink[]
  actions?: React.ReactNode
  maxWidthClassName?: string
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-10">
      <div className={`mx-auto ${maxWidthClassName}`}>
        {backLinks.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {backLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                ← {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-[#9A7A17]">CFI Workspace</p>
            <h1 className="text-3xl font-semibold text-darkText">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-slate-600">{description}</p>}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>

        {children}
      </div>
    </div>
  )
}
