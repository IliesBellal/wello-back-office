import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';

interface InfoTooltipProps {
  title: string;
  description: string;
  iconClassName?: string;
  children?: React.ReactNode;
}

export function InfoTooltip({ title, description, iconClassName = '', children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`p-1 ml-1 ${iconClassName}`}
        onClick={() => setOpen(true)}
        aria-label="Informations"
        tabIndex={0}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            {description}
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
