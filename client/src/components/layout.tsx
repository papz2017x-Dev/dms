import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Settings,
  Menu,
  Plus,
  Search,
  Bell,
  User as UserIcon,
  Users2Icon,
  LogOut,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  AlertDialog, 
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

import { api, type Notification } from "@/lib/api";

const SidebarContent = ({ pathname }: { pathname: string }) => {
  const user = api.getCurrentUser();
  let links = [];

  if (user?.role === "user") {
    links.push({ href: "/user-dashboard", label: "My Account", icon: UserIcon });
  } else {
    links.push({ href: "/", label: "Dashboard", icon: LayoutDashboard });
    links.push({ href: "/user-dashboard", label: "My Account", icon: UserIcon });
    links.push({ href: "/documents", label: "Documents", icon: FileText });
  }

  if (user?.role === "superuser" || user?.role === "admin") {
    links.push({ href: "/categories", label: "Workflows", icon: FolderTree });
  }

  if (user?.role === "superuser") {
    links.push({ href: "/superuser", label: "Users", icon: Users2Icon });
    links.push({ href: "/superuser/uploads", label: "Uploads", icon: Settings });
  }

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <div className="w-4 h-4 bg-primary-foreground rounded-sm" />
          </div>
          DocTrack
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1">
        <div className="text-xs font-semibold text-sidebar-foreground/60 px-3 mb-2 uppercase tracking-wider">
          Main
        </div>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <span
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                pathname === link.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
              )}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="w-8 h-8 border border-sidebar-border shrink-0">
              <AvatarFallback>{user?.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.fullName}</span>
              <span className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</span>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/60 hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Logging Out?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end your current session and require you to sign in again to access the platform.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    api.logout();
                    window.location.reload();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const user = api.getCurrentUser();
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications", user?.id],
    queryFn: () => api.getNotifications(),
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10s
  });

  const unreadCount = notifications.filter(n => n.isRead === 0).length;

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => api.markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const clearAllNotifications = useMutation({
    mutationFn: () => api.clearNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => n.isRead === 0).map(n => n.id);
    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds);
    }
  };

  const handleClearAll = () => {
    clearAllNotifications.mutate();
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <div className="fixed inset-y-0 w-64">
          <SidebarContent pathname={location} />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent side="left" className="p-0 w-64 border-r border-sidebar-border bg-sidebar">
            <SidebarContent pathname={location} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur px-6">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="flex-1">
            <div className="relative max-w-md hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documents..."
                className="pl-9 bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:bg-secondary/80">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in duration-300">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 shadow-xl border-sidebar-border" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[11px] h-auto p-0 hover:bg-transparent text-primary hover:text-primary/80"
                        onClick={handleMarkAllRead}
                      >
                        Mark all read
                      </Button>
                    )}
                    {notifications.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[11px] h-auto p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                        onClick={handleClearAll}
                        disabled={clearAllNotifications.isPending}
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="grid divide-y">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={cn(
                          "relative group p-4 hover:bg-muted/50 transition-colors space-y-1",
                          notif.isRead === 0 && "bg-primary/5"
                        )}>
                          <div className="pr-6">
                            <Link 
                              href={`/documents/${notif.documentId}`}
                              onClick={() => {
                                if (notif.isRead === 0) markReadMutation.mutate([notif.id]);
                                setIsNotifOpen(false);
                              }}
                            >
                              <div className="cursor-pointer">
                                <p className="text-xs leading-relaxed">{notif.message}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </Link>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteNotification.mutate(notif.id);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button className="gap-2 shadow-sm" asChild>
              <Link href="/documents?new=true">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Document</span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
