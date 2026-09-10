"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { trackStep } from "@/lib/track-client";

export default function TrackedLink({
  href,
  trackingEvent,
  className,
  children,
}: {
  href: string;
  trackingEvent: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} onClick={() => trackStep(trackingEvent)} className={className}>
      {children}
    </Link>
  );
}
