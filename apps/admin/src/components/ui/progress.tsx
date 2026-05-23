import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50",
      className
    )}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-in-out relative"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    >
      <div className="absolute inset-0 bg-white/20 dark:bg-white/10 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
    </div>
  </div>
))
Progress.displayName = "Progress"

export { Progress }
