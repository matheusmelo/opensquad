import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, description, actions }: Props) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-4">
    <div>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
