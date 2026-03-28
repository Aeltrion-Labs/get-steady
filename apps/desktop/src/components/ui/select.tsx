import * as React from "react";
import { cn } from "../../lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground outline-none transition focus:border-primary",
        className,
      )}
      {...props}
    />
  ),
);

Select.displayName = "Select";
