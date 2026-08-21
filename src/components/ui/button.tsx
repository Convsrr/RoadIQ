import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[background-color,color,transform,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default: "bg-primary px-5 text-primary-foreground shadow-[0_10px_30px_rgba(255,104,70,.16)] hover:bg-primary/90",
        secondary: "bg-secondary px-5 text-secondary-foreground hover:bg-secondary/80",
        ghost: "px-4 text-muted-foreground hover:bg-accent hover:text-foreground",
        outline: "border border-border bg-card/70 px-5 text-foreground hover:bg-accent",
        danger: "bg-destructive px-5 text-white hover:bg-destructive/90",
      },
      size: {
        default: "h-12",
        sm: "h-11 px-4 text-xs",
        lg: "h-14 px-7 text-base",
        icon: "size-11 shrink-0 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
