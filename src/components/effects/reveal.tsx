/**
 * Lightweight layout wrappers. Content stays visible on the server-rendered
 * first paint and does not depend on animation JavaScript to appear.
 */

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return <div className={className}>{children}</div>;
}

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
