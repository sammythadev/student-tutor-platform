"use client";

import { useMemo } from "react";
import { LabelList, Pie, PieChart } from "recharts";
import { motion, useReducedMotion } from "motion/react";
import { PieChart as PieChartIcon } from "lucide-react";
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
import { ChartEmpty } from "@/components/widgets/chart-empty";
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
 * Subject mix donut. Shows real session counts per subject; with nothing to plot
 * it hands off to the shared chart empty state instead of drawing a single grey
 * slice, which read as one real subject called "No sessions yet".
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

	const data = useMemo<PieDatum[]>(
		() =>
			[...distribution]
				.sort((a, b) => b.count - a.count)
				.slice(0, 6)
				.map((d, i) => ({
					subject: d.subject,
					value: d.count,
					fill: PIE_COLORS[i % PIE_COLORS.length],
				})),
		[distribution],
	);

	const config = useMemo(() => buildConfig(data), [data]);
	const total = data.reduce((sum, d) => sum + d.value, 0);
	const isEmpty = total === 0;

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
					{isEmpty ? (
						<ChartEmpty
							action={{ label: "Find a tutor", href: "/tutors" }}
							description="Finish a session and the subjects you spend time on split out here."
							icon={PieChartIcon}
							shape="ring"
							title="No subject mix yet"
						/>
					) : (
						<>
							<ChartContainer
								className="mx-auto aspect-square max-h-72 w-full"
								config={config}
							>
								<PieChart accessibilityLayer>
									<Pie
										cornerRadius={8}
										data={data}
										dataKey="value"
										innerRadius={36}
										isAnimationActive
										nameKey="subject"
										outerRadius="88%"
										stroke="var(--card)"
										strokeWidth={4}
									>
										<LabelList
											className="fill-background font-medium"
											dataKey="value"
											fill="currentColor"
											fontWeight={500}
											formatter={(label) => String(label ?? "")}
											position="inside"
											stroke="none"
										/>
									</Pie>
									<ChartLegend content={<ChartLegendContent nameKey="subject" />} />
								</PieChart>
							</ChartContainer>
							<p className="mt-2 text-center text-xs text-muted-foreground">
								{`${total} session${total === 1 ? "" : "s"} in the mix`}
							</p>
						</>
					)}
				</CardContent>
			</DashboardCard>
		</motion.div>
	);
}
