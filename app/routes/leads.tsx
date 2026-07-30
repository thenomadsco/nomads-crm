import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Phone, Mail, Globe, MessageCircle, Plus, Zap } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "~/components/ui/table";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "~/components/ui/sheet";
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
import { ScoreBadge } from "~/components/score-badge";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { useData } from "~/lib/data-context";
import { updateLeadStatus, createLead, batchScoreLeads, computeLeadScore, scoreToUrgency } from "~/lib/db";
import type { Lead, LeadCategory, LeadStatus } from "~/lib/mock-data";

type Filter = "All" | LeadCategory;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	New: "outline",
	Contacted: "secondary",
	Converted: "default",
	Lost: "destructive",
};

const URGENCY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	High: "destructive",
	Medium: "secondary",
	Low: "outline",
};

const PAGE_SIZE = 50;

const EMPTY_FORM = {
	name: "",
	email: "",
	phone: "",
	destination: "",
	trip_category: "",
	timeline: "",
	travelers: "",
	budget: "",
	vibe: "",
	contact_method: "",
	urgency_level: "" as "" | "High" | "Medium" | "Low",
	lead_status: "New" as LeadStatus,
	source: "manual",
};

export default function Leads() {
	const { leads, loading, setLeads, refetch } = useData();
	const [filter, setFilter] = useState<Filter>("All");
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
	const [showNewLead, setShowNewLead] = useState(false);
	const [scoring, setScoring] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);

	const filtered = useMemo(() => {
		setPage(1);
		return leads.filter((l) => {
			const score = l.lead_score ?? -1;
			const matchesFilter =
				filter === "All" ||
				(filter === "Hot" && score >= 75) ||
				(filter === "Warm" && score >= 50 && score < 75) ||
				(filter === "Cold" && score < 50 && score >= 0);
			const q = query.trim().toLowerCase();
			const matchesQuery =
				!q ||
				(l.name?.toLowerCase().includes(q) ?? false) ||
				(l.email?.toLowerCase().includes(q) ?? false) ||
				(l.destination?.toLowerCase().includes(q) ?? false);
			return matchesFilter && matchesQuery;
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [leads, filter, query]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

	const duplicate = useMemo(() => {
		if (!form.email && !form.phone) return null;
		return leads.find((l) =>
			(form.email && l.email?.toLowerCase() === form.email.toLowerCase()) ||
			(form.phone && l.phone === form.phone),
		) ?? null;
	}, [form.email, form.phone, leads]);

	const previewScore = computeLeadScore({
		budget: form.budget ? Number(form.budget) : 0,
		urgency_level: (form.urgency_level || "Low") as "High" | "Medium" | "Low",
		travelers: form.travelers ? Number(form.travelers) : 1,
		destination: form.destination,
		phone: form.phone,
		email: form.email,
		vibe: form.vibe,
		trip_category: form.trip_category,
		contact_method: form.contact_method,
	});

	function set(key: keyof typeof EMPTY_FORM, value: string) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	async function handleScoreAll() {
		setScoring(true);
		try {
			const n = await batchScoreLeads();
			toast.success(`Scored ${n} leads`, { description: "Scores and urgency levels updated." });
			await refetch();
		} catch (e) {
			toast.error("Scoring failed", { description: String(e) });
		} finally {
			setScoring(false);
		}
	}

	async function handleCreateLead() {
		if (!form.name.trim()) {
			toast.error("Name is required");
			return;
		}
		setSaving(true);
		try {
			const lead = await createLead({
				name: form.name.trim(),
				email: form.email || undefined,
				phone: form.phone || undefined,
				destination: form.destination || undefined,
				trip_category: form.trip_category || undefined,
				timeline: form.timeline || undefined,
				travelers: form.travelers ? Number(form.travelers) : undefined,
				budget: form.budget ? Number(form.budget) : undefined,
				vibe: form.vibe || undefined,
				contact_method: form.contact_method || undefined,
				urgency_level: (form.urgency_level || undefined) as "High" | "Medium" | "Low" | undefined,
				lead_status: form.lead_status,
				source: form.source || "manual",
			});
			setLeads([lead, ...leads]);
			toast.success(`Lead created · Score ${lead.lead_score ?? previewScore}`, {
				description: lead.name,
			});
			setShowNewLead(false);
			setForm(EMPTY_FORM);
		} catch (e) {
			toast.error("Failed to create lead", { description: String(e) });
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Leads</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${filtered.length} of ${leads.length} leads`}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<div className="relative w-full sm:w-56">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search name, email, destination…"
							className="pl-8"
							value={query}
							onChange={(e) => { setQuery(e.target.value); setPage(1); }}
						/>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleScoreAll}
						disabled={scoring}
					>
						<Zap className="h-4 w-4 mr-1" />
						{scoring ? "Scoring…" : "Score Unscored"}
					</Button>
					<Button size="sm" onClick={() => setShowNewLead(true)}>
						<Plus className="h-4 w-4 mr-1" />
						New Lead
					</Button>
				</div>
			</div>

			<Tabs value={filter} onValueChange={(v) => { setFilter(v as Filter); setPage(1); }}>
				<TabsList>
					<TabsTrigger value="All">All</TabsTrigger>
					<TabsTrigger value="Hot">Hot</TabsTrigger>
					<TabsTrigger value="Warm">Warm</TabsTrigger>
					<TabsTrigger value="Cold">Cold</TabsTrigger>
				</TabsList>
			</Tabs>

			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
				className="overflow-hidden rounded-lg border"
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Destination</TableHead>
							<TableHead>Occasion</TableHead>
							<TableHead>Travelers</TableHead>
							<TableHead>Budget</TableHead>
							<TableHead>Urgency</TableHead>
							<TableHead>Score</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
									Loading leads…
								</TableCell>
							</TableRow>
						)}
						{!loading && pageSlice.map((l) => (
							<TableRow
								key={l.id}
								className="cursor-pointer"
								onClick={() => setSelectedLead(l)}
							>
								<TableCell className="max-w-[200px]">
									<p className="font-medium truncate">
										{l.name || <span className="italic text-muted-foreground">No name on file</span>}
									</p>
									<p className="text-xs text-muted-foreground truncate">{l.email ?? "—"}</p>
								</TableCell>
								<TableCell>{l.destination ?? <span className="text-muted-foreground">—</span>}</TableCell>
								<TableCell>{l.trip_category ?? <span className="text-muted-foreground">—</span>}</TableCell>
								<TableCell>{l.travelers ?? <span className="text-muted-foreground">—</span>}</TableCell>
								<TableCell>
									{(l.budget ?? 0) > 0 ? `₹${(l.budget ?? 0).toLocaleString("en-IN")}` : <span className="text-muted-foreground">—</span>}
								</TableCell>
								<TableCell>
									{l.urgency_level ? (
										<Badge variant={URGENCY_VARIANT[l.urgency_level] ?? "outline"}>{l.urgency_level}</Badge>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell>
									<ScoreBadge category={l.lead_category ?? null} score={l.lead_score} />
								</TableCell>
								<TableCell>
									<Badge variant={STATUS_VARIANT[l.lead_status] ?? "outline"}>{l.lead_status}</Badge>
								</TableCell>
							</TableRow>
						))}
						{!loading && pageSlice.length === 0 && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
									No leads match this filter.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between text-sm text-muted-foreground">
					<span>Page {safePage} of {totalPages}</span>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={safePage <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={safePage >= totalPages}
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			<LeadPanel
				lead={selectedLead}
				onClose={() => setSelectedLead(null)}
				onStatusChange={(id, status) => {
					if (selectedLead?.id === id) {
						setSelectedLead((prev) => prev ? { ...prev, lead_status: status } : prev);
					}
				}}
			/>

			{/* New Lead Dialog */}
			<Dialog open={showNewLead} onOpenChange={(open) => { if (!open) { setShowNewLead(false); setForm(EMPTY_FORM); } }}>
				<DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New Lead</DialogTitle>
					</DialogHeader>

					{duplicate && (
						<div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
							Possible duplicate: <span className="font-medium">{duplicate.name}</span> already has this email or phone.
						</div>
					)}

					<div className="grid grid-cols-2 gap-3 text-sm">
						{/* Name */}
						<div className="col-span-2 flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Name *</label>
							<Input placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
						</div>
						{/* Email + Phone */}
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Email</label>
							<Input placeholder="email@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Phone</label>
							<Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
						</div>
						{/* Destination + Trip Category */}
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Destination</label>
							<Input placeholder="Bali, Switzerland…" value={form.destination} onChange={(e) => set("destination", e.target.value)} />
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Occasion</label>
							<Select value={form.trip_category} onValueChange={(v) => set("trip_category", v)}>
								<SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="Honeymoon">Honeymoon</SelectItem>
									<SelectItem value="Family Trip">Family Trip</SelectItem>
									<SelectItem value="Solo">Solo</SelectItem>
									<SelectItem value="Group">Group</SelectItem>
									<SelectItem value="Adventure">Adventure</SelectItem>
									<SelectItem value="Business">Business</SelectItem>
									<SelectItem value="Anniversary">Anniversary</SelectItem>
									<SelectItem value="Other">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{/* Travelers + Budget */}
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Travelers</label>
							<Input type="number" placeholder="2" min={1} value={form.travelers} onChange={(e) => set("travelers", e.target.value)} />
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Budget (₹)</label>
							<Input type="number" placeholder="150000" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
						</div>
						{/* Timeline + Vibe */}
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Timeline</label>
							<Input placeholder="June 2026, ASAP…" value={form.timeline} onChange={(e) => set("timeline", e.target.value)} />
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Vibe</label>
							<Input placeholder="Relaxed, Adventure…" value={form.vibe} onChange={(e) => set("vibe", e.target.value)} />
						</div>
						{/* Contact Method + Urgency */}
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Contact Method</label>
							<Select value={form.contact_method} onValueChange={(v) => set("contact_method", v)}>
								<SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="WhatsApp">WhatsApp</SelectItem>
									<SelectItem value="Phone">Phone</SelectItem>
									<SelectItem value="Email">Email</SelectItem>
									<SelectItem value="Instagram">Instagram</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Urgency Override</label>
							<Select value={form.urgency_level} onValueChange={(v) => set("urgency_level", v as "" | "High" | "Medium" | "Low")}>
								<SelectTrigger><SelectValue placeholder="Auto-compute" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="High">High</SelectItem>
									<SelectItem value="Medium">Medium</SelectItem>
									<SelectItem value="Low">Low</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{/* Status + Source */}
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Status</label>
							<Select value={form.lead_status} onValueChange={(v) => set("lead_status", v as LeadStatus)}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="New">New</SelectItem>
									<SelectItem value="Contacted">Contacted</SelectItem>
									<SelectItem value="Converted">Converted</SelectItem>
									<SelectItem value="Lost">Lost</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Source</label>
							<Input placeholder="manual, referral…" value={form.source} onChange={(e) => set("source", e.target.value)} />
						</div>
					</div>

					{/* Score preview */}
					<div className="rounded-md border bg-muted/40 p-3 flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Predicted score</span>
						<div className="flex items-center gap-2">
							<span className="font-semibold">{previewScore}</span>
							<ScoreBadge category={null} score={previewScore} />
						</div>
					</div>

					<DialogFooter showCloseButton>
						<Button onClick={handleCreateLead} disabled={saving || !form.name.trim()}>
							{saving ? "Creating…" : "Create Lead"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function LeadPanel({
	lead,
	onClose,
	onStatusChange,
}: {
	lead: Lead | null;
	onClose: () => void;
	onStatusChange: (id: string, status: LeadStatus) => void;
}) {
	const { leads, inquiries, followUps, setLeads } = useData();
	const [savingStatus, setSavingStatus] = useState(false);

	const leadInquiries = useMemo(
		() => lead ? inquiries.filter((i) => i.lead_id === lead.id) : [],
		[inquiries, lead],
	);
	const leadFollowUps = useMemo(
		() => lead ? followUps.filter((f) => f.lead_id === lead.id) : [],
		[followUps, lead],
	);

	async function handleStatusChange(status: LeadStatus) {
		if (!lead) return;
		setSavingStatus(true);
		try {
			await updateLeadStatus(lead.id, status);
			onStatusChange(lead.id, status);
			setLeads(leads.map((l) => l.id === lead.id ? { ...l, lead_status: status } : l));
		} finally {
			setSavingStatus(false);
		}
	}

	if (!lead) return null;

	return (
		<Sheet open={!!lead} onOpenChange={(open) => { if (!open) onClose(); }}>
			<SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
				<SheetHeader className="pr-8">
					<SheetTitle className="text-lg">{lead.name || "Unnamed Lead"}</SheetTitle>
					<SheetDescription className="flex items-center gap-2 flex-wrap">
						<ScoreBadge category={lead.lead_category ?? null} score={lead.lead_score} />
						{lead.urgency_level && (
							<Badge variant={URGENCY_VARIANT[lead.urgency_level] ?? "outline"}>
								{lead.urgency_level} urgency
							</Badge>
						)}
					</SheetDescription>
				</SheetHeader>

				<div className="px-4 pb-6 space-y-6">
					{/* Status */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-muted-foreground w-20 shrink-0">Status</span>
						<Select
							value={lead.lead_status}
							onValueChange={(v) => handleStatusChange(v as LeadStatus)}
							disabled={savingStatus}
						>
							<SelectTrigger className="w-36 h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="New">New</SelectItem>
								<SelectItem value="Contacted">Contacted</SelectItem>
								<SelectItem value="Converted">Converted</SelectItem>
								<SelectItem value="Lost">Lost</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Separator />

					{/* Contact Info */}
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
						<div className="space-y-1.5 text-sm">
							{lead.email && (
								<div className="flex items-center gap-2">
									<Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span>{lead.email}</span>
								</div>
							)}
							{lead.phone && (
								<div className="flex items-center gap-2">
									<Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span>{lead.phone}</span>
								</div>
							)}
							{lead.contact_method && (
								<div className="flex items-center gap-2">
									<MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-muted-foreground">Prefers {lead.contact_method}</span>
								</div>
							)}
							{lead.source && (
								<div className="flex items-center gap-2">
									<Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-muted-foreground">{lead.source}</span>
								</div>
							)}
							{lead.contact_consent && (
								<p className="text-xs text-muted-foreground">✓ Marketing consent given</p>
							)}
						</div>
					</div>

					<Separator />

					{/* Trip Details */}
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trip Details</p>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							<div>
								<dt className="text-muted-foreground">Destination</dt>
								<dd className="font-medium">{lead.destination ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Timeline</dt>
								<dd className="font-medium">{lead.timeline ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Occasion</dt>
								<dd className="font-medium">{lead.trip_category ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Travelers</dt>
								<dd className="font-medium">{lead.travelers ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Vibe</dt>
								<dd className="font-medium">{lead.vibe ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Budget</dt>
								<dd className="font-medium">
									{(lead.budget ?? 0) > 0 ? `₹${(lead.budget ?? 0).toLocaleString("en-IN")}` : "Not specified"}
								</dd>
							</div>
						</dl>
					</div>

					{/* AI Enrichment */}
					{(lead.ai_summary || lead.next_action) && (
						<>
							<Separator />
							<div className="space-y-3">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Analysis</p>
								{lead.ai_summary && (
									<div>
										<p className="text-xs text-muted-foreground mb-1">Summary</p>
										<p className="text-sm leading-relaxed">{lead.ai_summary}</p>
									</div>
								)}
								{lead.next_action && (
									<div>
										<p className="text-xs text-muted-foreground mb-1">Recommended next action</p>
										<p className="text-sm font-medium text-accent">{lead.next_action}</p>
									</div>
								)}
							</div>
						</>
					)}

					{/* Inquiry History */}
					{leadInquiries.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Inquiry History ({leadInquiries.length})
								</p>
								<div className="space-y-2">
									{leadInquiries.map((inq) => (
										<div key={inq.id} className="rounded-md border p-3 text-sm space-y-1">
											<div className="flex items-center justify-between">
												<span className="font-medium">{inq.destination ?? "—"}</span>
												<span className="text-xs text-muted-foreground">
													{new Date(inq.created_at).toLocaleDateString("en-IN")}
												</span>
											</div>
											{(inq.timeline || inq.vibe || inq.travelers) && (
												<p className="text-xs text-muted-foreground">
													{[
														inq.timeline,
														inq.travelers ? `${inq.travelers} travelers` : null,
														inq.vibe,
													].filter(Boolean).join(" · ")}
												</p>
											)}
										</div>
									))}
								</div>
							</div>
						</>
					)}

					{/* Nurture Follow-ups */}
					{leadFollowUps.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Nurture Sequence
								</p>
								<div className="space-y-2">
									{leadFollowUps.map((fu) => (
										<div key={fu.id} className="rounded-md border p-3 text-sm">
											<div className="flex items-center justify-between mb-1">
												<span className="text-xs font-medium">
													Stage {fu.sequence_stage}
												</span>
												<div className="flex items-center gap-2">
													<span className="text-xs text-muted-foreground">{fu.follow_up_date}</span>
													<Badge variant={fu.completed ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
														{fu.completed ? "Sent" : "Pending"}
													</Badge>
												</div>
											</div>
											{fu.message_template && (
												<p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
													{fu.message_template}
												</p>
											)}
										</div>
									))}
								</div>
							</div>
						</>
					)}

					{/* Meta */}
					<Separator />
					<p className="text-xs text-muted-foreground">
						Created {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
					</p>
				</div>
			</SheetContent>
		</Sheet>
	);
}
