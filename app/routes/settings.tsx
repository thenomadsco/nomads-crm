import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useAuth, type Role } from "~/lib/auth-context";
import { useNotifications, NOTIFICATION_TYPES } from "~/lib/notifications";

const ROLE_LABELS: Record<Role, string> = {
	vedant: "Vedant (Admin)",
	kirti: "Kirti (Operations)",
	billing: "Billing Desk",
};

function Toggle({ enabled, onClick, disabled }: { enabled: boolean; onClick: () => void; disabled?: boolean }) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-pressed={enabled}
			className={cn(
				"relative h-5 w-9 rounded-full transition-colors disabled:opacity-40",
				enabled ? "bg-primary" : "bg-muted-foreground/25",
				!disabled && "cursor-pointer",
			)}
		>
			<span
				className={cn(
					"absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
					enabled ? "translate-x-4" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}

export default function Settings() {
	const { user } = useAuth();
	const { prefs, setPref, simulateEvent } = useNotifications();
	if (!user) return null;

	const isAdmin = user.scopes.includes("admin");
	const roles: Role[] = isAdmin ? ["vedant", "kirti", "billing"] : [user.role];

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<div>
				<h1 className="font-display text-2xl font-semibold">Settings</h1>
				<p className="text-sm text-muted-foreground">
					{isAdmin
						? "Control which notification types reach each role."
						: "Your current notification preferences (set by your admin)."}
				</p>
			</div>

			<Card className="overflow-hidden p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Notification Type</TableHead>
							{roles.map((role) => (
								<TableHead key={role} className="text-center">
									{ROLE_LABELS[role]}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{NOTIFICATION_TYPES.map((type) => (
							<TableRow key={type.id}>
								<TableCell>
									<p className="font-medium">{type.label}</p>
									<p className="text-xs text-muted-foreground">{type.description}</p>
								</TableCell>
								{roles.map((role) => (
									<TableCell key={role} className="text-center">
										<div className="flex justify-center">
											<Toggle
												enabled={prefs[role]?.[type.id] ?? false}
												disabled={!isAdmin}
												onClick={() => setPref(role, type.id, !prefs[role]?.[type.id])}
											/>
										</div>
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			<Card className="p-5">
				<h2 className="mb-1 text-sm font-semibold">Test alerts</h2>
				<p className="mb-4 text-xs text-muted-foreground">
					Fire a sample notification for your own account to see how it lands (bell + toast).
				</p>
				<div className="flex flex-wrap gap-2">
					{NOTIFICATION_TYPES.map((type) => (
						<Button key={type.id} size="sm" variant="outline" onClick={() => simulateEvent(type.id)}>
							{type.label}
						</Button>
					))}
				</div>
			</Card>
		</div>
	);
}
