import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
import { cn } from "~/lib/utils";
import { today, type Task } from "~/lib/mock-data";
import { useData } from "~/lib/data-context";
import { updateTaskStatus, createTask, updateTask, deleteTask } from "~/lib/db";

type PriorityFilter = "All" | Task["priority"];

function groupLabel(task: Task): "Overdue" | "Today" | "Upcoming" | "Done" {
	if (task.status === "Done") return "Done";
	const t = today();
	if (task.due_date < t) return "Overdue";
	if (task.due_date === t) return "Today";
	return "Upcoming";
}

const GROUP_ORDER = ["Overdue", "Today", "Upcoming", "Done"] as const;

const TASK_TYPES = [
	"WhatsApp Outreach",
	"Call",
	"Email Follow-Up",
	"Manual Review",
	"Payment Chase",
	"Document Collection",
	"Quote Preparation",
	"Booking Confirmation",
];

const EMPTY_FORM = {
	lead_id: "",
	task_type: "",
	priority: "Medium" as "High" | "Medium" | "Low",
	due_date: "",
	notes: "",
};

export default function Tasks() {
	const { tasks, leads, setTasks, loading } = useData();
	const [filter, setFilter] = useState<PriorityFilter>("All");
	const [showNewTask, setShowNewTask] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [editForm, setEditForm] = useState(EMPTY_FORM);
	const [editSaving, setEditSaving] = useState(false);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [searchParams] = useSearchParams();
	const highlight = searchParams.get("highlight");
	const highlightRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!highlight || loading) return;
		const timer = setTimeout(() => {
			highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 300);
		return () => clearTimeout(timer);
	}, [highlight, loading]);

	async function toggleDone(id: string) {
		const task = tasks.find((t) => t.id === id);
		if (!task) return;
		const next = task.status === "Done" ? "Open" : "Done";
		setTasks(tasks.map((t) => (t.id === id ? { ...t, status: next } : t)));
		try {
			await updateTaskStatus(id, next);
		} catch {
			setTasks(tasks.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
		}
	}

	function set(key: keyof typeof EMPTY_FORM, value: string) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function setEdit(key: keyof typeof EMPTY_FORM, value: string) {
		setEditForm((prev) => ({ ...prev, [key]: value }));
	}

	async function handleCreateTask() {
		if (!form.lead_id || !form.task_type.trim() || !form.due_date) {
			toast.error("Lead, task type, and due date are required");
			return;
		}
		setSaving(true);
		try {
			const task = await createTask({
				lead_id: form.lead_id,
				task_type: form.task_type.trim(),
				priority: form.priority,
				due_date: form.due_date,
				notes: form.notes || undefined,
			});
			setTasks([task, ...tasks]);
			toast.success("Task created", { description: `${form.task_type} · ${form.due_date}` });
			setShowNewTask(false);
			setForm(EMPTY_FORM);
		} catch (e) {
			toast.error("Failed to create task", { description: String(e) });
		} finally {
			setSaving(false);
		}
	}

	function openEdit(task: Task) {
		setEditingTask(task);
		setEditForm({
			lead_id: task.lead_id,
			task_type: task.task_type,
			priority: task.priority,
			due_date: task.due_date,
			notes: task.notes ?? "",
		});
	}

	async function handleEditTask() {
		if (!editingTask || !editForm.task_type.trim() || !editForm.due_date) {
			toast.error("Task type and due date are required");
			return;
		}
		setEditSaving(true);
		try {
			const updated = await updateTask(editingTask.id, {
				task_type: editForm.task_type.trim(),
				priority: editForm.priority,
				due_date: editForm.due_date,
				notes: editForm.notes || null,
			});
			setTasks(tasks.map((t) => (t.id === editingTask.id ? updated : t)));
			toast.success("Task updated");
			setEditingTask(null);
		} catch (e) {
			toast.error("Failed to update task", { description: String(e) });
		} finally {
			setEditSaving(false);
		}
	}

	async function handleDeleteTask() {
		if (!confirmDeleteId) return;
		setDeleting(true);
		try {
			await deleteTask(confirmDeleteId);
			setTasks(tasks.filter((t) => t.id !== confirmDeleteId));
			toast.success("Task deleted");
			setConfirmDeleteId(null);
		} catch (e) {
			toast.error("Failed to delete task", { description: String(e) });
		} finally {
			setDeleting(false);
		}
	}

	const filtered = useMemo(
		() => tasks.filter((t) => filter === "All" || t.priority === filter),
		[tasks, filter],
	);

	const grouped = useMemo(() => {
		const groups: Record<string, Task[]> = { Overdue: [], Today: [], Upcoming: [], Done: [] };
		for (const t of filtered) groups[groupLabel(t)].push(t);
		return groups;
	}, [filtered]);

	const openCount = tasks.filter((t) => t.status === "Open").length;

	const sortedLeads = useMemo(
		() => [...leads].sort((a, b) => {
			const aActive = a.lead_status !== "Lost" && a.lead_status !== "Converted" ? 0 : 1;
			const bActive = b.lead_status !== "Lost" && b.lead_status !== "Converted" ? 0 : 1;
			return aActive - bActive || (a.name ?? "").localeCompare(b.name ?? "");
		}),
		[leads],
	);

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Tasks</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${openCount} open of ${tasks.length} total`}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Tabs value={filter} onValueChange={(v) => setFilter(v as PriorityFilter)}>
						<TabsList>
							<TabsTrigger value="All">All</TabsTrigger>
							<TabsTrigger value="High">High</TabsTrigger>
							<TabsTrigger value="Medium">Medium</TabsTrigger>
							<TabsTrigger value="Low">Low</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button size="sm" onClick={() => setShowNewTask(true)}>
						<Plus className="h-4 w-4 mr-1" />
						New Task
					</Button>
				</div>
			</div>

			{loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading tasks…</p>}

			{!loading && (
				<div className="space-y-8">
					{GROUP_ORDER.map((group) => {
						const items = grouped[group];
						if (items.length === 0) return null;
						return (
							<div key={group}>
								<h2
									className={cn(
										"mb-3 text-xs font-semibold tracking-wide uppercase",
										group === "Overdue" ? "text-destructive" : "text-muted-foreground",
									)}
								>
									{group} · {items.length}
								</h2>
								<div className="space-y-2">
									<AnimatePresence initial={false}>
										{items.map((t) => {
											const leadName = t.leads?.name;
											const dest = t.leads?.destination;
											const done = t.status === "Done";
											const isHighlighted = highlight === t.id;
											const isConfirmDelete = confirmDeleteId === t.id;
											return (
												<motion.div
													key={t.id}
													layout
													initial={{ opacity: 0, y: 8 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, x: 20 }}
													transition={{ duration: 0.25 }}
													ref={isHighlighted ? highlightRef : undefined}
												>
													<Card
														className={cn(
															"flex items-center gap-3 p-3.5 transition-colors",
															done && "opacity-50",
															t.escalated && !done && "border-destructive/40 bg-destructive/5",
															isHighlighted && !done && "ring-2 ring-primary ring-offset-1",
														)}
													>
														<button
															onClick={() => toggleDone(t.id)}
															aria-label={done ? "Mark as open" : "Mark as done"}
															className={cn(
																"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
																done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary",
															)}
														>
															{done && <Check className="h-3 w-3" />}
														</button>
														<div className="flex-1 min-w-0">
															<p className={cn("text-sm font-medium truncate", done && "line-through")}>
																{leadName || <span className="italic text-muted-foreground">No name on file</span>}
															</p>
															<p className="text-xs text-muted-foreground truncate">
																{t.task_type}{dest ? ` · ${dest}` : ""}
																{t.escalated && !done && (
																	<span className="ml-1.5 font-medium text-destructive">· Escalated</span>
																)}
																{t.notes && !done && (
																	<span className="ml-1.5 italic"> · {t.notes}</span>
																)}
															</p>
														</div>
														<span className="text-xs text-muted-foreground shrink-0">{t.due_date}</span>
														<Badge variant={t.priority === "High" ? "destructive" : t.priority === "Medium" ? "secondary" : "outline"}>
															{t.priority}
														</Badge>
														{isConfirmDelete ? (
															<div className="flex items-center gap-1 shrink-0">
																<Button
																	size="sm"
																	variant="destructive"
																	className="h-6 px-2 text-xs"
																	disabled={deleting}
																	onClick={handleDeleteTask}
																>
																	{deleting ? "…" : "Confirm"}
																</Button>
																<Button
																	size="sm"
																	variant="ghost"
																	className="h-6 px-2 text-xs"
																	onClick={() => setConfirmDeleteId(null)}
																>
																	Cancel
																</Button>
															</div>
														) : (
															<div className="flex items-center gap-1 shrink-0">
																<button
																	onClick={() => openEdit(t)}
																	aria-label="Edit task"
																	className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/10"
																>
																	<Pencil className="h-3 w-3" />
																</button>
																<button
																	onClick={() => setConfirmDeleteId(t.id)}
																	aria-label="Delete task"
																	className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
																>
																	<Trash2 className="h-3 w-3" />
																</button>
															</div>
														)}
													</Card>
												</motion.div>
											);
										})}
									</AnimatePresence>
								</div>
							</div>
						);
					})}
					{filtered.length === 0 && (
						<p className="py-8 text-center text-sm text-muted-foreground">No tasks match this filter.</p>
					)}
				</div>
			)}

			{/* New Task Dialog */}
			<Dialog open={showNewTask} onOpenChange={(open) => { if (!open) { setShowNewTask(false); setForm(EMPTY_FORM); } }}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>New Task</DialogTitle>
					</DialogHeader>
					<TaskForm form={form} setField={set} leads={sortedLeads} showLeadField />
					<DialogFooter showCloseButton>
						<Button onClick={handleCreateTask} disabled={saving || !form.lead_id || !form.task_type || !form.due_date}>
							{saving ? "Creating…" : "Create Task"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Task Dialog */}
			<Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
					</DialogHeader>
					{editingTask && (
						<>
							<p className="text-sm text-muted-foreground -mt-2">
								{editingTask.leads?.name || "Unnamed lead"}
								{editingTask.leads?.destination ? ` · ${editingTask.leads.destination}` : ""}
							</p>
							<TaskForm form={editForm} setField={setEdit} leads={sortedLeads} showLeadField={false} />
						</>
					)}
					<DialogFooter showCloseButton>
						<Button onClick={handleEditTask} disabled={editSaving || !editForm.task_type || !editForm.due_date}>
							{editSaving ? "Saving…" : "Save Changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function TaskForm({
	form,
	setField,
	leads,
	showLeadField,
}: {
	form: typeof EMPTY_FORM;
	setField: (key: keyof typeof EMPTY_FORM, value: string) => void;
	leads: import("~/lib/mock-data").Lead[];
	showLeadField: boolean;
}) {
	return (
		<div className="space-y-3 text-sm">
			{showLeadField && (
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-muted-foreground">Lead *</label>
					<Select value={form.lead_id} onValueChange={(v) => setField("lead_id", v)}>
						<SelectTrigger><SelectValue placeholder="Select a lead…" /></SelectTrigger>
						<SelectContent className="max-h-60">
							{leads.map((l) => (
								<SelectItem key={l.id} value={l.id}>
									{l.name || "Unnamed"}{l.destination ? ` · ${l.destination}` : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground">Task Type *</label>
				<Select value={form.task_type} onValueChange={(v) => setField("task_type", v)}>
					<SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
					<SelectContent>
						{TASK_TYPES.map((tt) => (
							<SelectItem key={tt} value={tt}>{tt}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-muted-foreground">Priority</label>
					<Select value={form.priority} onValueChange={(v) => setField("priority", v as "High" | "Medium" | "Low")}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="High">High</SelectItem>
							<SelectItem value="Medium">Medium</SelectItem>
							<SelectItem value="Low">Low</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-muted-foreground">Due Date *</label>
					<Input type="date" value={form.due_date} onChange={(e) => setField("due_date", e.target.value)} />
				</div>
			</div>
			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground">Notes</label>
				<Input placeholder="Optional notes…" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
			</div>
		</div>
	);
}
