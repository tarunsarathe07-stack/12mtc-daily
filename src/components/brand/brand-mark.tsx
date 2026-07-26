import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = 40,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/12-minutes-to-clat-mark.jpg"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-lg object-cover", className)}
    />
  );
}
