import { STATUS_LABEL, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<Status, string> = {
  novo: "bg-muted text-muted-foreground",
  em_contato: "bg-chart-3/15 text-chart-3",
  qualificado: "bg-accent/20 text-accent-foreground",
  cliente: "bg-chart-4/15 text-chart-4",
  descartado: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        styles[status] ?? styles.novo,
        className,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
