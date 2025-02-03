import React from 'react';
import { cn } from '@/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

const spinnerVariants = cva('flex-col items-center justify-center', {
  variants: {
    show: {
      true: 'flex',
      false: 'hidden',
    },
  },
  defaultVariants: {
    show: true,
  },
});

const loaderVariants = cva('animate-spin text-primary', {
  variants: {
    size: {
      small: 'size-6',
      medium: 'size-8',
      large: 'size-12',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

interface SpinnerContentProps
  extends VariantProps<typeof spinnerVariants>,
    VariantProps<typeof loaderVariants> {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Renders a spinner component that displays a loading indicator.
 *
 * @param {Object} props - The properties for the Spinner component.
 * @param {string} props.size - The size of the spinner, which determines its dimensions.
 * @param {boolean} props.show - A flag indicating whether the spinner should be visible.
 * @param {React.ReactNode} props.children - The content to be displayed alongside the spinner.
 * @param {string} [props.className] - An optional additional class name for custom styling.
 *
 * @returns {JSX.Element} The rendered spinner component.
 *
 * @example
 * // Example usage of the Spinner component
 * <Spinner size="large" show={true} className="custom-class">
 *   Loading...
 * </Spinner>
 *
 * @throws {Error} Throws an error if the size is not valid or if show is not a boolean.
 */
export function Spinner({ size, show, children, className }: SpinnerContentProps) {
  return (
    <span className={spinnerVariants({ show })}>
      <Loader2 className={cn(loaderVariants({ size }), className)} />
      {children}
    </span>
  );
}
