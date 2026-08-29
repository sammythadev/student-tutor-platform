import { BillingHealth } from "@/components/widgets/billing-health";
import { ChannelSalesChart } from "@/components/widgets/channel-sales-chart";
import { DashboardActivity } from "@/components/widgets/dashboard-activity";
import { DashboardInvoices } from "@/components/widgets/dashboard-invoices";
import { NetRevenueChart } from "@/components/widgets/net-revenue-chart";
import { DashboardStats } from "@/components/widgets/stats";

/**
 * Reference composition of the demo widget set.
 * Kept under components/widgets/ so product dashboards compose their own
 * pages from these blocks instead of importing a monolith.
 */
export function Dashboard() {
	return (
		<div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
			<DashboardStats />
			<NetRevenueChart />
			<ChannelSalesChart />
			<DashboardInvoices />
			<BillingHealth />
			<DashboardActivity />
		</div>
	);
}
