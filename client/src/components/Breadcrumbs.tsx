import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link 
        href="/dashboard" 
        className="flex items-center gap-1 text-muted-foreground hover-elevate rounded-md px-2 py-1 transition-colors"
        data-testid="breadcrumb-home"
      >
        <Home className="h-4 w-4" />
        <span>Home</span>
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.icon;
        
        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="flex items-center gap-1 text-muted-foreground hover-elevate rounded-md px-2 py-1 transition-colors"
                data-testid={`breadcrumb-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span 
                className="flex items-center gap-1 font-medium text-foreground px-2 py-1"
                aria-current={isLast ? "page" : undefined}
                data-testid={`breadcrumb-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
