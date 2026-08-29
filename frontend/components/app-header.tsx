"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { isNavPathActive, navLinks } from "@/components/app-shared";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { NavUser } from "@/components/nav-user";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BellIcon } from "lucide-react";

export function AppHeader() {
	const pathname = usePathname();
	const activeItem = navLinks.find((item) => isNavPathActive(pathname, item));

	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6",
				"bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50"
			)}
		>
			<div className="flex items-center gap-3">
				<CustomSidebarTrigger />
				<Separator
					className="mr-2 h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<AppBreadcrumbs page={activeItem} />
			</div>
			<div className="flex items-center gap-2">
				<Button asChild aria-label="Notifications" size="icon-sm" variant="ghost">
					<Link href="/notifications">
						<BellIcon />
					</Link>
				</Button>
				<ThemeToggle />
				<Separator
					className="mx-1 h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<NavUser />
			</div>
		</header>
	);
}
