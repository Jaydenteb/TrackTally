"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = "default", padding = "md", children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        styles.card,
        styles[variant],
        styles[`padding${padding.charAt(0).toUpperCase()}${padding.slice(1)}`],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn(styles.header, className)} {...props}>
      {children}
    </div>
  );
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { className, as: Component = "h3", children, ...props },
  ref
) {
  return (
    <Component ref={ref} className={cn(styles.title, className)} {...props}>
      {children}
    </Component>
  );
});

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  function CardDescription({ className, children, ...props }, ref) {
    return (
      <p ref={ref} className={cn(styles.description, className)} {...props}>
        {children}
      </p>
    );
  }
);

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn(styles.content, className)} {...props}>
      {children}
    </div>
  );
});

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn(styles.footer, className)} {...props}>
      {children}
    </div>
  );
});
