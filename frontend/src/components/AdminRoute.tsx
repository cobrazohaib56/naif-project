// Admin role was removed: any authenticated user can access former admin
// pages. This component is kept as a thin pass-through so route definitions
// don't need to be touched.
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
