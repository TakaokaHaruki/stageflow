export default function SectionHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="mb-2 flex min-h-8 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="flex min-h-8 items-center gap-1.5 text-sm font-bold leading-tight">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && <div className="text-xs leading-tight text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex min-h-8 shrink-0 flex-wrap items-center justify-end gap-1.5">{actions}</div>}
    </div>
  );
}
