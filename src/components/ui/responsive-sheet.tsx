import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ResponsiveSheet = SheetPrimitive.Root;

const ResponsiveSheetTrigger = SheetPrimitive.Trigger;

const ResponsiveSheetClose = SheetPrimitive.Close;

const ResponsiveSheetPortal = SheetPrimitive.Portal;

const ResponsiveSheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
ResponsiveSheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top overflow-y-auto",
        bottom:
          "inset-x-0 bottom-0 border-t rounded-t-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[95vh] safe-area-bottom overflow-y-auto",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm overflow-y-auto",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-lg overflow-y-auto",
        fullscreen: "inset-0 w-screen h-screen rounded-none data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 flex flex-col",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface ResponsiveSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  showHandle?: boolean;
  fullscreenOnMobile?: boolean;
}

const ResponsiveSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  ResponsiveSheetContentProps
>(({ side = "right", className, children, showHandle = true, fullscreenOnMobile = false, ...props }, ref) => {
  const isMobile = useIsMobile();
  const effectiveSide = fullscreenOnMobile && isMobile ? "fullscreen" : (isMobile ? "bottom" : side);

  return (
    <ResponsiveSheetPortal>
      <ResponsiveSheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          sheetVariants({ side: effectiveSide }),
          effectiveSide !== 'fullscreen' && "p-4 md:p-6",
          className
        )}
        {...props}
      >
        {/* Handle for bottom sheet on mobile */}
        {isMobile && showHandle && effectiveSide === "bottom" && (
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-4" />
        )}
        {children}
        <SheetPrimitive.Close className={cn(
          "absolute rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none min-w-[44px] min-h-[44px] flex items-center justify-center",
          effectiveSide === 'fullscreen' ? 'right-4 top-4' : 'right-4 top-4'
        )}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </ResponsiveSheetPortal>
  );
});
ResponsiveSheetContent.displayName = SheetPrimitive.Content.displayName;

const ResponsiveSheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
ResponsiveSheetHeader.displayName = "ResponsiveSheetHeader";

const ResponsiveSheetFixedHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "sticky top-0 z-40 bg-background border-b border-border",
      "flex items-center justify-between p-4 md:p-6 gap-4",
      "flex-shrink-0",
      className
    )} 
    {...props} 
  />
);
ResponsiveSheetFixedHeader.displayName = "ResponsiveSheetFixedHeader";

const ResponsiveSheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4",
      "sticky bottom-0 bg-background pt-4 pb-safe -mx-4 md:-mx-6 px-4 md:px-6 border-t border-border",
      className
    )} 
    {...props} 
  />
);
ResponsiveSheetFooter.displayName = "ResponsiveSheetFooter";

const ResponsiveSheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex-1 overflow-y-auto p-4 md:p-6",
      className
    )} 
    {...props} 
  />
);
ResponsiveSheetBody.displayName = "ResponsiveSheetBody";

const ResponsiveSheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground pr-8", className)} {...props} />
));
ResponsiveSheetTitle.displayName = SheetPrimitive.Title.displayName;

const ResponsiveSheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
ResponsiveSheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  ResponsiveSheet,
  ResponsiveSheetClose,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetFixedHeader,
  ResponsiveSheetBody,
  ResponsiveSheetOverlay,
  ResponsiveSheetPortal,
  ResponsiveSheetTitle,
  ResponsiveSheetTrigger,
};
