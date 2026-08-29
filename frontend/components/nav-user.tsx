"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store/authStore";
import {
	UserRoundIcon,
	SettingsIcon,
	LogOutIcon,
} from "lucide-react";

export function NavUser() {
	const router = useRouter();
	const user = useAuthStore((s) => s.user);
	const fullName = useAuthStore((s) => s.fullName);
	const initials = useAuthStore((s) => s.initials);
	const clearSession = useAuthStore((s) => s.clearSession);

	const name = fullName() || "Account";
	const email = user?.email ?? "";

	function handleSignOut() {
		clearSession();
		router.push("/signin");
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Open account menu"
					className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Avatar className="size-8">
						{user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
						<AvatarFallback className="text-xs font-medium">
							{initials()}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuLabel className="flex items-center gap-3">
					<Avatar className="size-10">
						{user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
						<AvatarFallback className="text-sm font-medium">
							{initials()}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<span className="block truncate font-medium text-foreground">
							{name}
						</span>
						{email && (
							<span className="block max-w-full truncate text-xs text-muted-foreground">
								{email}
							</span>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/profile">
							<UserRoundIcon />
							Profile
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/settings">
							<SettingsIcon />
							Settings
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
						variant="destructive"
						onClick={handleSignOut}
					>
						<LogOutIcon />
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
