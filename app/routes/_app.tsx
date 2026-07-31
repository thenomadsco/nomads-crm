import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
	LayoutDashboard,
	Users,
	CheckSquare,
	Plane,
	FileText,
	Stamp,
	FileSpreadsheet,
	Receipt,
	Wallet,
	MessageSquareHeart,
	Settings,
	LogOut,
	ListTodo,
	CalendarDays,
} from "lucide-react";
import {
	SidebarProvider,
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarInset,
	SidebarTrigger,
} from "~/components/ui/sidebar";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { NotificationBell } from "~/components/notification-bell";
import { useAuth, type Scope } from "~/lib/auth-context";
import { DataProvider } from "~/lib/data-context";
import { usePendingWork } from "~/lib/pending-work";
import { cn } from "~/lib/utils";

const NAV: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; scope: Scope | "all" }[] = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, scope: "all" },
	{ to: "/calendar", label: "Calendar", icon: CalendarDays, scope: "all" },
	{ to: "/leads", label: "Leads", icon: Users, scope: "operational" },
	{ to: "/tasks", label: "Tasks", icon: CheckSquare, scope: "operational" },
	{ to: "/bookings", label: "Bookings", icon: Plane, scope: "operational" },
	{ to: "/travelers", label: "Travelers", icon: Users, scope: "operational" },
	{ to: "/visas", label: "Visas", icon: Stamp, scope: "operational" },
	{ to: "/documents", label: "Documents", icon: FileText, scope: "operational" },
	{ to: "/feedback", label: "Feedback", icon: MessageSquareHeart, scope: "operational" },
	{ to: "/quotes", label: "Quotes", icon: FileSpreadsheet, scope: "financial" },
	{ to: "/invoices", label: "Invoices", icon: Receipt, scope: "financial" },
	{ to: "/spendings", label: "Spendings", icon: Wallet, scope: "financial" },
];

export default function AppLayout() {
	const { user, ready } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (ready && !user) navigate("/", { replace: true });
	}, [ready, user, navigate]);

	if (!ready || !user) return null;

	return (
		<DataProvider>
			<AppLayoutInner />
		</DataProvider>
	);
}

function AppLayoutInner() {
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const pendingWork = usePendingWork();

	if (!user) return null;

	const visibleNav = NAV.filter((item) => item.scope === "all" || user.scopes.includes(item.scope));
	const hasOverdue = pendingWork.some((i) => i.severity === "overdue");
	const currentLabel =
		visibleNav.find((n) => n.to === location.pathname)?.label ??
		(location.pathname === "/settings" ? "Settings" : location.pathname === "/pending" ? "Pending Work" : "");

	return (
		<SidebarProvider>
			<Sidebar collapsible="icon">
				<SidebarHeader className="px-3 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
					<div className="flex items-center gap-2">
						<img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-md" />
						<div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
							<span className="text-sm font-semibold">Nomads CRM</span>
							<span className="text-xs text-muted-foreground">The Nomads Co.</span>
						</div>
					</div>
				</SidebarHeader>
				<Separator />
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Workspace</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										isActive={location.pathname === "/pending"}
										onClick={() => navigate("/pending")}
										tooltip="Pending Work"
										className={cn(
											"relative",
											hasOverdue && "bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive",
										)}
									>
										<ListTodo />
										<span>Pending Work</span>
										{pendingWork.length > 0 && (
											<span
												className={cn(
													"ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
													hasOverdue ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground",
												)}
											>
												{pendingWork.length}
											</span>
										)}
									</SidebarMenuButton>
								</SidebarMenuItem>
								{visibleNav.map((item) => (
									<SidebarMenuItem key={item.to}>
										<SidebarMenuButton
											isActive={location.pathname === item.to}
											onClick={() => navigate(item.to)}
											tooltip={item.label}
										>
											<item.icon />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter className="px-3 pb-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={location.pathname === "/settings"}
								onClick={() => navigate("/settings")}
								tooltip="Settings"
							>
								<Settings />
								<span>Settings</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
					<div className="flex items-center gap-2 rounded-md px-1 py-1.5">
						<Avatar className="h-8 w-8">
							<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
								{user.initials}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
							<span className="text-sm font-medium">{user.name}</span>
							<span className="text-xs text-muted-foreground">{user.title}</span>
						</div>
						<button
							onClick={() => {
								signOut();
								navigate("/");
							}}
							className="group-data-[collapsible=icon]:hidden rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							aria-label="Sign out"
						>
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<header className="flex items-center justify-between gap-2 border-b px-4" style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
					<div className="flex items-center gap-2">
						<SidebarTrigger />
						<Separator orientation="vertical" className="h-5" />
						<span className="text-sm font-medium text-muted-foreground">{currentLabel}</span>
					</div>
					<NotificationBell />
				</header>
				<main className="flex-1 p-6">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
