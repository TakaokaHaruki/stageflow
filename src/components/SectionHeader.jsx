export default function SectionHeader({ icon: Icon, title, subtitle, description, actions }) {
  return (
    <div className="mb-2 flex min-h-9 flex-col gap-1.5 pt-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="flex min-h-9 items-start gap-2 pt-1 text-[15px] font-bold leading-tight tracking-tight">
          {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-primary" />}
          <span className="truncate">{title}</span>
          {description && <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">{description}</span>}
        </h2>
        {subtitle && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex min-h-9 w-full flex-wrap items-start justify-start gap-1.5 pt-1 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-2">{actions}</div>}
    </div>
  );
}