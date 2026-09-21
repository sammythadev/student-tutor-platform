import type { ReactNode } from "react";
import {
	LayoutGridIcon,
	CalendarDaysIcon,
	UsersIcon,
	UsersRoundIcon,
	BookOpenIcon,
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
				title: "Courses",
				path: "/courses",
				icon: <BookOpenIcon />,
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
 * Role-aware navigation.
 *
 * `/tutors` role-switches its whole page: a student gets the tutor catalog, a
 * tutor gets `StudentList` — the reach-out surface where they message a student
 * and send a session request. So a tutor keeps the **path** and only the label
 * changes; repointing this entry at `/tutor-dashboard/find-students` (the
 * message-only matched-candidates page) silently strands the reach-out flow.
 *
 * On top of that:
 * - tutors and admins get **My Students** (`/courses/students`), the per-student
 *   rollup of the courses they authored — the view that answers "which course did
 *   I set for whom, and how are they following it";
 * - a student gets the mirror, **My tutors** (`/courses/tutors`), the same rollup
 *   from the other side: who set what, how far along they are, and what is next.
 */
export function getNavGroups(role?: string | null): SidebarNavGroup[] {
	const groups =
		role === 'tutor'
			? navGroups.map((group) => ({
					...group,
					items: group.items.map((item) =>
						item.path === '/tutors' ? { ...item, title: 'Find Students' } : item
					),
				}))
			: navGroups;

	if (role !== 'tutor' && role !== 'admin' && role !== 'student') return groups;

	const studentsEntry: SidebarNavItem = {
		title: role === 'student' ? 'My tutors' : 'My Students',
		path: role === 'student' ? '/courses/tutors' : '/courses/students',
		icon: <UsersRoundIcon />,
	};

	return groups.map((group) =>
		group.label !== 'Learn'
			? group
			: {
					...group,
					items: group.items.flatMap((item): SidebarNavItem[] =>
						item.path === '/courses' ? [item, studentsEntry] : [item]
					),
				}
	);
}

export function getNavLinks(role?: string | null): SidebarNavItem[] {
	return [
		...getNavGroups(role).flatMap((group) =>
			group.items.flatMap((item) =>
				item.subItems?.length ? [item, ...item.subItems] : [item]
			)
		),
		...footerNavLinks,
	];
}

/**
 * Active-state resolution for the sidebar and header breadcrumb.
 * The dashboard entry also owns the tutor-dashboard alias route, and Courses
 * stands down on the nested relationship routes (`/courses/students`,
 * `/courses/tutors`) so only one entry lights up.
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
	if (
		item.path === "/courses" &&
		(pathname.startsWith("/courses/students") ||
			pathname.startsWith("/courses/tutors"))
	) {
		return false;
	}
	return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
