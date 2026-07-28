"use client";

import { Breadcrumbs, PageHeader, Stack } from "@agrismartchain/noki-design-system";

/**
 * `@agrismartchain/noki-design-system`'s barrel pulls in a `client-only`
 * guard transitively, so it must never be imported directly from a Server
 * Component page.tsx (Next.js aborts route-config collection with
 * "'client-only' cannot be imported from a Server Component module"). Every
 * page.tsx imports these thin "use client" wrappers instead.
 */
export function PageStack({ children }: { children: React.ReactNode }) {
  return <Stack gap="lg">{children}</Stack>;
}

export interface SectionHeaderProps {
  breadcrumbsLabel: string;
  brandLabel: string;
  brandHref: string;
  sectionLabel: string;
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeader({ breadcrumbsLabel, brandLabel, brandHref, sectionLabel, eyebrow, title, description }: SectionHeaderProps) {
  return (
    <>
      <Breadcrumbs label={breadcrumbsLabel} items={[{ label: brandLabel, href: brandHref }, { label: sectionLabel, current: true }]} />
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
    </>
  );
}
