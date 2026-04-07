import { NavLink } from '@/components/NavLink';
import { NavigationSubItem, IconComponent } from '@/config/navigationConfig';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubItemsPopoverProps {
  itemId: string;
  label: string;
  icon: IconComponent;
  subItems: NavigationSubItem[];
}

export const SubItemsPopover: React.FC<SubItemsPopoverProps> = ({
  itemId,
  label,
  icon: Icon,
  subItems,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'w-11 h-11 rounded-lg transition-all duration-200',
            'hover:bg-sidebar-accent/80 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          )}
          title={label}
          aria-label={label}
        >
          <Icon className="w-5 h-5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        className="w-56 p-3 rounded-lg shadow-lg border border-sidebar-border"
      >
        <div className="space-y-1">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-bold text-sidebar-foreground/60 uppercase tracking-wide">
              {label}
            </p>
          </div>

          {subItems.map((subItem) => {
            const SubIcon = subItem.icon;

            return (
              <NavLink
                key={subItem.id}
                to={subItem.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                  'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
                activeClassName="bg-sidebar-accent/80 text-sidebar-foreground font-medium"
              >
                <SubIcon className="w-4 h-4 shrink-0 flex-none" />
                <span className="truncate">{subItem.label}</span>
                {subItem.badge ? (
                  <span className="ml-auto inline-flex items-center rounded-full bg-destructive/80 px-2 py-1 text-xs font-medium text-destructive-foreground">
                    {subItem.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
