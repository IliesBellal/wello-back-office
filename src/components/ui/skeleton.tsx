import { cn } from "@/lib/utils";

/**
 * Skeleton — gradient shimmer loader.
 *
 * Uses a 3-stop horizontal gradient sized at 200% of the element width and
 * animated via `bg-shimmer` (see tailwind.config.ts). The result is a smooth
 * highlight sweep, matching the modern best practice for loading placeholders.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "bg-[linear-gradient(90deg,transparent_0%,hsl(var(--muted-foreground)/0.12)_50%,transparent_100%)]",
        "bg-[length:200%_100%] animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
