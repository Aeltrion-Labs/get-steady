import * as React from "react";
import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-2xl border border-border bg-white/85 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
