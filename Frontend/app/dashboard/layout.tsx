export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Individual dashboard pages supply their own DashboardLayout (with header + sidebar).
  // This root layout is intentionally minimal — no extra wrapper or duplicate header.
  return <>{children}</>;
}
