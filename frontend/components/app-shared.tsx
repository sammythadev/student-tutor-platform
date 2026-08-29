import type { ReactNode } from "react";
import {
	LayoutGridIcon,
	CalendarDaysIcon,
	UsersIcon,
	MessagesSquareIcon,
	BellIcon,
	NewspaperIcon,
	UserRoundIcon,
	SettingsIcon,
	CircleHelpIcon,
} from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

/** Routes that should not render as plain links (e.g. auth-gated flows). */
export const navGroups: SidebarNavGroup[] = [
	{
		label: "Learn",
		items: [
			{
				title: "Dashboard",
				path: "/dashboard",
				icon: <LayoutGridIcon />,
			},
			{
				title: "Find Tutors",
				path: "/tutors",
				icon: <UsersIcon />,
			},
			{
				title: "Schedules",
				path: "/schedules",
				icon: <CalendarDaysIcon />,
			},
		],
	},
	{
		label: "Connect",
		items: [
			{
				title: "Messages",
				path: "/messages",
				icon: <MessagesSquareIcon />,
			},
			{
				title: "Notifications",
				path: "/notifications",
				icon: <BellIcon />,
			},
			{
				title: "Feed",
				path: "/feed",
				icon: <NewspaperIcon />,
			},
		],
	},
	{
		label: "Account",
		items: [
			{
				title: "Profile",
				path: "/profile",
				icon: <UserRoundIcon />,
			},
			{
				title: "Settings",
				path: "/settings",
				icon: <SettingsIcon />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Help Center",
		path: "#",
		icon: <CircleHelpIcon />,
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];

/**
 * Active-state resolution for the sidebar and header breadcrumb.
 * The dashboard entry also owns the tutor-dashboard alias route.
 */
export function isNavPathActive(
	pathname: string | null,
	item: SidebarNavItem
): boolean {
	if (!pathname || !item.path || item.path === "#") return false;
	if (item.path === "/dashboard") {
		return (
			pathname === "/dashboard" ||
			pathname.startsWith("/tutor-dashboard") ||
			pathname === "/admin"
		);
	}
	return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
