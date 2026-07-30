import { Bell } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { useNotifications } from "~/lib/notifications";
import { cn } from "~/lib/utils";

export function NotificationBell() {
	const { visibleEvents, unreadCount, markRead, markAllRead } = useNotifications();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-4 w-4" />
					{unreadCount > 0 && (
						<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
							{unreadCount}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<div className="flex items-center justify-between px-2 py-1.5">
					<DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
					{unreadCount > 0 && (
						<button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
							Mark all read
						</button>
					)}
				</div>
				<DropdownMenuSeparator />
				{visibleEvents.length === 0 && (
					<p className="px-2 py-4 text-center text-sm text-muted-foreground">Nothing to see here.</p>
				)}
				{visibleEvents.slice(0, 8).map((e) => (
					<DropdownMenuItem
						key={e.id}
						onClick={() => markRead(e.id)}
						className={cn("flex flex-col items-start gap-0.5 whitespace-normal py-2", !e.read && "bg-accent/10")}
					>
						<span className="flex w-full items-center gap-1.5 text-sm font-medium">
							{!e.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
							{e.title}
						</span>
						<span className="text-xs text-muted-foreground">{e.body}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
