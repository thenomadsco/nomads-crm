import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { useData } from "~/lib/data-context";
import { daysUntil } from "~/lib/mock-data";
import type { VisaApplication } from "~/lib/mock-data";

type StatusFilter = "All" | VisaApplication["status"];

export default function Visas() {
	const { visaApplications, loading } = useData();
	const [filter, setFilter] = useState<StatusFilter>("All");

	const filtered = useMemo(
		() => visaApplications.filter((v) => filter === "All" || v.status === filter),
		[visaApplications, filter],
	);

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Visas</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${filtered.length} of ${visaApplications.length} applications`}
					</p>
				</div>
				<Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
					<TabsList>
						<TabsTrigger value="All">All</TabsTrigger>
						<TabsTrigger value="Pending">Pending</TabsTrigger>
						<TabsTrigger value="Approved">Approved</TabsTrigger>
						<TabsTrigger value="Rejected">Rejected</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35 }}
				className="overflow-hidden rounded-lg border"
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Traveler</TableHead>
							<TableHead>Country</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Submission</TableHead>
							<TableHead>Appointment</TableHead>
							<TableHead>Expiry</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
									Loading visa applications…
								</TableCell>
							</TableRow>
						)}
						{!loading && filtered.map((v) => {
							const remaining = v.expiry_date ? daysUntil(v.expiry_date) : null;
							const expiringSoon = v.status === "Approved" && remaining !== null && remaining <= 30;
							return (
								<TableRow key={v.id}>
									<TableCell className="font-medium">{v.travelers?.name ?? "—"}</TableCell>
									<TableCell>{v.country}</TableCell>
									<TableCell>{v.visa_type}</TableCell>
									<TableCell>
										<Badge variant={v.status === "Approved" ? "default" : v.status === "Rejected" ? "destructive" : "secondary"}>
											{v.status}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">{v.submission_date ?? "—"}</TableCell>
									<TableCell className="text-muted-foreground">{v.appointment_date ?? "—"}</TableCell>
									<TableCell>
										{v.expiry_date ?? <span className="text-muted-foreground">—</span>}
										{expiringSoon && (
											<span className="ml-2 text-xs font-medium text-destructive">{remaining}d left</span>
										)}
									</TableCell>
								</TableRow>
							);
						})}
						{!loading && filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
									No visa applications match this filter.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>
		</div>
	);
}
