"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
	const isMessaging = usePathname() === "/messages";

	return (
		<SidebarProvider className={cn(
			"[--app-wrapper-max-width:80rem]",
			isMessaging && "h-dvh min-h-0 overflow-hidden"
		)}>
			<AppSidebar />
			<SidebarInset className={cn("min-w-0", isMessaging && "min-h-0 overflow-hidden")}>
				<AppHeader className={isMessaging ? "hidden md:flex" : undefined} />
				<div
					className={cn(
						"flex flex-1 flex-col p-3 md:p-6",
						"mx-auto w-full max-w-(--app-wrapper-max-width)",
						isMessaging && "p-0 md:p-6"
					)}
				>
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
