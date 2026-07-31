import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "~/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useData } from "~/lib/data-context";
import { updateVisa } from "~/lib/db";
import { daysUntil } from "~/lib/mock-data";
import type { VisaApplication } from "~/lib/mock-data";

type StatusFilter = "All" | VisaApplication["status"];

type EditForm = {
	status: VisaApplication["status"];
	submission_date: string;
	appointment_date: string;
	expiry_date: string;
};

export default function Visas() {
	const { visaApplications, setVisaApplications, loading } = useData();
	const [filter, setFilter] = useState<StatusFilter>("All");
	const [query, setQuery] = useState("");
	const [editing, setEditing] = useState<VisaApplication | null>(null);
	const [editForm, setEditForm] = useState<EditForm>({ status: "Pending", submission_date: "", appointment_date: "", expiry_date: "" });
	const [saving, setSaving] = useState(false);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return visaApplications.filter((v) => {
			const matchesStatus = filter === "All" || v.status === filter;
			const matchesQuery =
				!q ||
				(v.travelers?.name?.toLowerCase().includes(q) ?? false) ||
				v.country.toLowerCase().includes(q) ||
				v.visa_type.toLowerCase().includes(q);
			return matchesStatus && matchesQuery;
		});
	}, [visaApplications, filter, query]);

	function openEdit(v: VisaApplication) {
		setEditing(v);
		setEditForm({
			status: v.status,
			submission_date: v.submission_date ?? "",
			appointment_date: v.appointment_date ?? "",
			expiry_date: v.expiry_date ?? "",
		});
	}

	async function handleSave() {
		if (!editing) return;
		setSaving(true);
		const fields = {
			status: editForm.status,
			submission_date: editForm.submission_date || null,
			appointment_date: editForm.appointment_date || null,
			expiry_date: editForm.expiry_date || null,
		};
		try {
			await updateVisa(editing.id, fields);
			setVisaApplications(
				visaApplications.map((v) => v.id === editing.id ? { ...v, ...fields } : v),
			);
			toast.success("Visa updated");
			setEditing(null);
		} catch (e) {
			toast.error("Failed to update visa", { description: String(e) });
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Visas</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${filtered.length}${query || filter !== "All" ? ` of ${visaApplications.length}` : ""} applications`}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<div className="relative w-full sm:w-52">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search traveler, country…"
							className="pl-8"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
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
							<TableHead className="w-16" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
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
									<TableCell>
										<Button size="sm" variant="ghost" onClick={() => openEdit(v)} className="h-7 px-2 text-xs">
											Edit
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
						{!loading && filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
									No visa applications match this filter.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>

			{/* Edit Visa Dialog */}
			<Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>
							{editing ? `${editing.country} · ${editing.visa_type}` : "Edit Visa"}
						</DialogTitle>
					</DialogHeader>
					{editing && (
						<div className="space-y-3 text-sm">
							<p className="text-xs text-muted-foreground">Traveler: {editing.travelers?.name ?? "—"}</p>
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-muted-foreground">Status</label>
								<Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as VisaApplication["status"] }))}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="Pending">Pending</SelectItem>
										<SelectItem value="Approved">Approved</SelectItem>
										<SelectItem value="Rejected">Rejected</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-muted-foreground">Submission Date</label>
								<Input type="date" value={editForm.submission_date} onChange={(e) => setEditForm((f) => ({ ...f, submission_date: e.target.value }))} />
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-muted-foreground">Appointment Date</label>
								<Input type="date" value={editForm.appointment_date} onChange={(e) => setEditForm((f) => ({ ...f, appointment_date: e.target.value }))} />
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-muted-foreground">Expiry Date</label>
								<Input type="date" value={editForm.expiry_date} onChange={(e) => setEditForm((f) => ({ ...f, expiry_date: e.target.value }))} />
							</div>
						</div>
					)}
					<DialogFooter showCloseButton>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? "Saving…" : "Save Changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
