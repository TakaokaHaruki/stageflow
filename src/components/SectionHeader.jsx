export default function SectionHeader({ icon: Icon, title, subtitle, description, actions }) {
  return (
    <div className="mb-1.5 flex min-h-8 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-1.5">
      <div className="min-w-0 flex-1">
        <h2 className="flex min-h-8 items-center gap-1.5 text-sm font-bold leading-tight">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
          <span className="truncate">{title}</span>
          {description && <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">{description}</span>}
        </h2>
        {subtitle && <div className="text-xs leading-tight text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex min-h-8 w-full flex-wrap items-center justify-start gap-1 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-1.5">{actions}</div>}
    </div>
  );
}