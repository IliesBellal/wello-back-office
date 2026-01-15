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
  "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 overflow-y-auto",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t rounded-t-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[95vh] safe-area-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-lg",
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
}

const ResponsiveSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  ResponsiveSheetContentProps
>(({ side = "right", className, children, showHandle = true, ...props }, ref) => {
  const isMobile = useIsMobile();
  const effectiveSide = isMobile ? "bottom" : side;

  return (
    <ResponsiveSheetPortal>
      <ResponsiveSheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side: effectiveSide }), "p-4 md:p-6", className)}
        {...props}
      >
        {/* Handle for bottom sheet on mobile */}
        {isMobile && showHandle && (
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-4" />
        )}
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none min-w-[44px] min-h-[44px] flex items-center justify-center">
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
  ResponsiveSheetOverlay,
  ResponsiveSheetPortal,
  ResponsiveSheetTitle,
  ResponsiveSheetTrigger,
};
