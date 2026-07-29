export default function PositionDetailExpand({ description }) {
  if (!description || !description.trim()) return null;

  return (
    <div className="mt-2 pl-3 border-l-2 border-primary/20">
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {description}
      </p>
    </div>
  );
}