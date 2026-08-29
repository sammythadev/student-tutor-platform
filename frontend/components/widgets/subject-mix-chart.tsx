"use client";

import { useMemo } from "react";
import { LabelList, Pie, PieChart } from "recharts";
import { motion, useReducedMotion } from "motion/react";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
} from "@/components/ui/chart";
import { DashboardCard } from "@/components/dashboard-card";
import type { SubjectDistribution } from "@/lib/api/dashboard";

const PIE_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--chart-6)",
];

type PieDatum = {
	subject: string;
	value: number;
	fill: string;
};

function buildConfig(data: PieDatum[]): ChartConfig {
	const config: ChartConfig = { value: { label: "Sessions" } };
	data.forEach((d) => {
		config[d.subject] = { label: d.subject, color: d.fill };
	});
	return config;
}

/**
 * Subject mix donut. Shows real session counts per subject; when there is no
 * data yet it still renders the ring with a dashed placeholder slice and a
 * hint label, so the block never looks blank.
 */
export function SubjectMixChart({
	distribution,
	title = "Subjects",
	description = "Session mix by subject.",
}: {
	distribution: SubjectDistribution[];
	title?: string;
	description?: string;
}) {
	const reduce = useReducedMotion();

	const data = useMemo<PieDatum[]>(() => {
		const sorted = [...distribution].sort((a, b) => b.count - a.count).slice(0, 6);
		if (sorted.length === 0) {
			return [
				{ subject: "No sessions yet", value: 1, fill: "var(--muted-foreground)" },
			];
		}
		return sorted.map((d, i) => ({
			subject: d.subject,
			value: d.count,
			fill: PIE_COLORS[i % PIE_COLORS.length],
		}));
	}, [distribution]);

	const config = useMemo(() => buildConfig(data), [data]);
	const total = data.reduce((sum, d) => sum + d.value, 0);
	const isEmpty = distribution.length === 0;

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
		>
			<DashboardCard className="gap-0 h-full">
				<CardHeader className="items-center space-y-1 pb-0 sm:items-start">
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className="my-auto">
					<ChartContainer
						className="mx-auto aspect-square max-h-72 w-full"
						config={config}
					>
						<PieChart accessibilityLayer>
							<Pie
								cornerRadius={isEmpty ? 0 : 8}
								data={data}
								dataKey="value"
								innerRadius={36}
								isAnimationActive
								nameKey="subject"
								outerRadius="88%"
								stroke="var(--card)"
								strokeWidth={4}
							>
								{isEmpty ? (
									<>
										{/* dashed placeholder ring so the block shows its shape */}
										<circle
											className="fill-none"
											cx="50%"
											cy="50%"
											stroke="var(--border)"
											strokeDasharray="4 4"
											r="45%"
										/>
									</>
								) : (
									<LabelList
										className="fill-background font-medium"
										dataKey="value"
										fill="currentColor"
										fontWeight={500}
										formatter={(label) => String(label ?? "")}
										position="inside"
										stroke="none"
									/>
								)}
							</Pie>
							{!isEmpty && (
								<ChartLegend content={<ChartLegendContent nameKey="subject" />} />
							)}
						</PieChart>
					</ChartContainer>
					<p className="mt-2 text-center text-xs text-muted-foreground">
						{isEmpty
							? "Complete a session and your subject mix will appear here."
							: `${total} session${total === 1 ? "" : "s"} in the mix`}
					</p>
				</CardContent>
			</DashboardCard>
		</motion.div>
	);
}
