"use client";
import * as React from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  variant, // "duo-a" | "duo-b" | undefined
}: React.PropsWithChildren<{ className?: string; variant?: "duo-a"|"duo-b" }>) {
  return (
    <div className={clsx("card", variant === "duo-a" && "card-duo-a", variant === "duo-b" && "card-duo-b", className)}>
      {children}
    </div>
  );
}
