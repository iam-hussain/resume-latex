export function Skeleton({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      aria-hidden
    />
  )
}
