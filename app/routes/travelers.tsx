import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";
import { Separator } from "~/components/ui/separator";
import { useData } from "~/lib/data-context";
import type { Traveler } from "~/lib/mock-data";

export default function Travelers() {
	const { travelers, visaApplications, documents, loading } = useData();
	const [selected, setSelected] = useState<Traveler | null>(null);
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return travelers;
		return travelers.filter((t) =>
			(t.name?.toLowerCase().includes(q) ?? false) ||
			(t.leads?.name?.toLowerCase().includes(q) ?? false) ||
			(t.passport_number?.toLowerCase().includes(q) ?? false) ||
			(t.nationality?.toLowerCase().includes(q) ?? false),
		);
	}, [travelers, query]);

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Travelers</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${filtered.length}${query ? ` of ${travelers.length}` : ""} travelers on file`}
					</p>
				</div>
				<div className="relative w-full sm:w-64">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search name, passport, nationality…"
						className="pl-8"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
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
							<TableHead>Name</TableHead>
							<TableHead>Linked Lead</TableHead>
							<TableHead>Passport No.</TableHead>
							<TableHead>Date of Birth</TableHead>
							<TableHead>Nationality</TableHead>
							<TableHead className="w-8" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
									Loading travelers…
								</TableCell>
							</TableRow>
						)}
						{!loading && filtered.map((t) => (
							<TableRow key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
								<TableCell className="font-medium">{t.name}</TableCell>
								<TableCell>{t.leads?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
								<TableCell>{t.passport_number ?? <span className="text-muted-foreground">—</span>}</TableCell>
								<TableCell>{t.date_of_birth ?? <span className="text-muted-foreground">—</span>}</TableCell>
								<TableCell>{t.nationality ?? <span className="text-muted-foreground">—</span>}</TableCell>
								<TableCell>
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</TableCell>
							</TableRow>
						))}
						{!loading && filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
									{query ? "No travelers match your search." : "No travelers on file yet."}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>

			<Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
				<SheetContent className="w-full sm:max-w-md">
					{selected && (
						<TravelerDetail
							traveler={selected}
							visas={visaApplications.filter((v) => v.traveler_id === selected.id)}
							docs={documents.filter((d) => d.traveler_id === selected.id)}
						/>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

function TravelerDetail({
	traveler,
	visas,
	docs,
}: {
	traveler: Traveler;
	visas: import("~/lib/mock-data").VisaApplication[];
	docs: import("~/lib/mock-data").Document[];
}) {
	return (
		<div className="flex h-full flex-col">
			<SheetHeader>
				<SheetTitle>{traveler.name}</SheetTitle>
				<SheetDescription>
					{traveler.leads?.name
						? `Traveling with ${traveler.leads.name}${traveler.leads.destination ? ` · ${traveler.leads.destination}` : ""}`
						: "No linked lead"}
				</SheetDescription>
			</SheetHeader>

			<div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
				<div className="rounded-md border p-3 text-sm">
					<div className="flex justify-between py-1">
						<span className="text-muted-foreground">Passport No.</span>
						<span className="font-medium">{traveler.passport_number ?? "—"}</span>
					</div>
					<div className="flex justify-between py-1">
						<span className="text-muted-foreground">Date of Birth</span>
						<span className="font-medium">{traveler.date_of_birth ?? "—"}</span>
					</div>
					<div className="flex justify-between py-1">
						<span className="text-muted-foreground">Nationality</span>
						<span className="font-medium">{traveler.nationality ?? "—"}</span>
					</div>
				</div>

				<Separator />

				<div>
					<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Visa Applications
					</h3>
					<div className="space-y-2">
						{visas.length === 0 && <p className="text-sm text-muted-foreground">None on file.</p>}
						{visas.map((v) => (
							<div key={v.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
								<div>
									<p className="font-medium">{v.country} · {v.visa_type}</p>
									{v.expiry_date && (
										<p className="text-xs text-muted-foreground">Expires {v.expiry_date}</p>
									)}
									{v.appointment_date && (
										<p className="text-xs text-muted-foreground">Appointment {v.appointment_date}</p>
									)}
								</div>
								<Badge variant={v.status === "Approved" ? "default" : v.status === "Rejected" ? "destructive" : "secondary"}>
									{v.status}
								</Badge>
							</div>
						))}
					</div>
				</div>

				<Separator />

				<div>
					<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Documents
					</h3>
					<div className="space-y-2">
						{docs.length === 0 && <p className="text-sm text-muted-foreground">None on file.</p>}
						{docs.map((d) => (
							<div key={d.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
								<div>
									<p className="font-medium">{d.document_type}</p>
									<p className="text-xs text-muted-foreground">{d.uploaded_at}</p>
								</div>
								{d.file_url && (
									<a
										href={d.file_url}
										target="_blank"
										rel="noopener noreferrer"
										className="text-xs underline text-muted-foreground hover:text-foreground"
										onClick={(e) => e.stopPropagation()}
									>
										View
									</a>
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
