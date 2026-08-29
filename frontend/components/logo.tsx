import type React from "react";
import { cn } from "@/lib/utils";

/** Tutorly monogram — rounded square with a "T". Inherits currentColor. */
export const LogoIcon = (props: React.ComponentProps<"svg">) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		{...props}
	>
		<rect width="24" height="24" rx="6" fill="currentColor" />
		<path
			d="M6.5 8.2C6.5 7.537 7.037 7 7.7 7h8.6c.663 0 1.2.537 1.2 1.2v.35c0 .663-.537 1.2-1.2 1.2h-2.55v6.05c0 .663-.537 1.2-1.2 1.2h-.3c-.663 0-1.2-.537-1.2-1.2V9.75H7.7c-.663 0-1.2-.537-1.2-1.2V8.2Z"
			fill="var(--background, #fff)"
		/>
	</svg>
);

/** Full lockup — monogram plus wordmark. */
export function Logo({
	className,
	showWordmark = true,
}: {
	className?: string;
	showWordmark?: boolean;
}) {
	return (
		<span className={cn("flex items-center gap-2", className)}>
			<LogoIcon className="size-6" />
			{showWordmark && (
				<span className="text-[15px] font-semibold tracking-tight">
					Tutorly
				</span>
			)}
		</span>
	);
}
