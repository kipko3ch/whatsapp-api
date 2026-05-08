import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-zinc-100 text-zinc-700",
  green: "bg-emerald-50 text-emerald-700",
  yellow: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}
