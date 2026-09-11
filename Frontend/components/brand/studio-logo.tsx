import { cn } from "@/lib/utils";
import Link from "next/link";

export function StudioMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-black.png"
      alt="مونتير"
      width={size * 3}
      height={size}
      className={cn("object-contain", className)}
    />
  );
}

export function StudioLogo({
  className,
  href = "/",
  showWordmark = true,
  size = 40,
  tone = "default",
}: {
  className?: string;
  href?: string | null;
  showWordmark?: boolean;
  size?: number;
  tone?: "default" | "invert";
}) {
  const content = (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tone === "invert" ? "/Logo-white.png" : "/logo-black.png"}
        alt="مونتير"
        width={size * 3.5}
        height={size}
        className="object-contain"
      />
    </span>
  );

  if (href === null) return content;

  return (
    <Link
      href={href}
      className="inline-flex items-center hover:opacity-80"
    >
      {content}
    </Link>
  );
}

