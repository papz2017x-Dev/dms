import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type User, type OrgNode, type UserRole } from "@/lib/api";
import { queryClient } from "@/lib/api";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Users as UsersIcon, 
  Network,
  Pencil
} from "lucide-react";
  import { Settings as SettingsIcon } from "lucide-react";
  import { Link } from "wouter";
  import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function SuperuserDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"users" | "org-chart">("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserEditDialogOpen, setIsUserEditDialogOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({ fullName: "", username: "", officeId: "", role: "user" as UserRole });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: api.getUsers,
  });

  const { data: orgNodes = [], isLoading: orgLoading } = useQuery({
    queryKey: ["/api/org-nodes"],
    queryFn: api.getOrgNodes,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) => api.updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-nodes"] });
      setIsUserEditDialogOpen(false);
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => api.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const createNodeMutation = useMutation({
    mutationFn: (node: Omit<OrgNode, "id">) => api.createOrgNode(node),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-nodes"] });
      toast({ title: "Node created successfully" });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (id: string) => api.deleteOrgNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-nodes"] });
      toast({ title: "Node deleted successfully" });
    },
  });

  const [newNode, setNewNode] = useState({ name: "", parentId: "", userId: "" });

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNode.name) return;
    
    // Convert "none" or empty string to undefined for the API
    const parentId = newNode.parentId === "none" || !newNode.parentId ? undefined : newNode.parentId;
    const userId = newNode.userId === "none" || !newNode.userId ? undefined : newNode.userId;

    createNodeMutation.mutate({
      name: newNode.name,
      parentId,
      userId,
    });
    setNewNode({ name: "", parentId: "", userId: "" });
  };

  const renderOrgChart = (parentId: string | null | undefined = undefined, level = 0) => {
    // Check for both null and undefined as root parent indicators
    const children = orgNodes.filter(node => {
      if (parentId === undefined) {
        return !node.parentId || node.parentId === "none";
      }
      return node.parentId === parentId;
    });
    
    if (children.length === 0) return null;

    return (
      <div className="space-y-2">
        {children.map(node => (
          <div key={node.id} style={{ marginLeft: `${level * 20}px` }}>
            <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-medium">{node.name}</span>
              {node.userId && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                  {users.find(u => u.id === node.userId)?.fullName || "Unknown User"}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-destructive"
                onClick={() => deleteNodeMutation.mutate(node.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {renderOrgChart(node.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  const officeMap = orgNodes.reduce((acc, node) => {
    acc[node.id] = node.name;
    return acc;
  }, {} as Record<string, string>);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      fullName: user.fullName,
      username: user.username,
      officeId: user.officeId || "none",
      role: user.role
    });
    setIsUserEditDialogOpen(true);
  };

  const onUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    updateUserMutation.mutate({
      id: editingUser.id,
      updates: {
        fullName: userFormData.fullName,
        username: userFormData.username,
        officeId: userFormData.officeId === "none" ? undefined : userFormData.officeId,
        role: userFormData.role
      }
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <UsersIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Superuser Dashboard</h1>
          <p className="text-muted-foreground">Manage users and organizational structure</p>
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href="/superuser/uploads">
                <DropdownMenuItem>Manage Uploads</DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b pb-px">
        <button
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === "users" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("users")}
        >
          User Management
          {activeTab === "users" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === "org-chart" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("org-chart")}
        >
          Organization Chart
          {activeTab === "org-chart" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {activeTab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>View and manage user roles across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="h-32 flex items-center justify-center">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                          {user.officeId ? (officeMap[user.officeId] || "Office") : "Not Assigned"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'superuser' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary mr-1"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "org-chart" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Hierarchical Chart
              </CardTitle>
              <CardDescription>Visual representation of your organization</CardDescription>
            </CardHeader>
            <CardContent>
              {orgLoading ? (
                <div className="h-32 flex items-center justify-center">Loading chart...</div>
              ) : orgNodes.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <Network className="h-8 w-8 mb-2 opacity-20" />
                  <p>No nodes defined. Start by adding a root department.</p>
                </div>
              ) : (
                <div className="p-4 bg-muted/20 rounded-lg border">
                  {renderOrgChart()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Node</CardTitle>
              <CardDescription>Create a new department or position</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateNode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="node-name">Name</Label>
                  <Input 
                    id="node-name" 
                    placeholder="e.g. Finance Department" 
                    value={newNode.name}
                    onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent-node">Parent Node</Label>
                  <Select 
                    value={newNode.parentId} 
                    onValueChange={(v) => setNewNode({ ...newNode, parentId: v })}
                  >
                    <SelectTrigger id="parent-node">
                      <SelectValue placeholder="Select parent (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Root)</SelectItem>
                      {orgNodes.map(node => (
                        <SelectItem key={node.id} value={node.id}>{node.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-user">Assign User</Label>
                  <Select 
                    value={newNode.userId} 
                    onValueChange={(v) => setNewNode({ ...newNode, userId: v })}
                  >
                    <SelectTrigger id="assign-user">
                      <SelectValue placeholder="Select user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={createNodeMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Add to Chart
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isUserEditDialogOpen} onOpenChange={setIsUserEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update information for {editingUser?.fullName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onUpdateUser} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input 
                id="edit-fullName" 
                value={userFormData.fullName}
                onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input 
                id="edit-username" 
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-office">Office Assignment</Label>
              <Select 
                value={userFormData.officeId} 
                onValueChange={(v) => setUserFormData({ ...userFormData, officeId: v })}
              >
                <SelectTrigger id="edit-office" className="w-full">
                  <SelectValue placeholder="Select Office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Assigned</SelectItem>
                  {orgNodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>{node.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Platform Role</Label>
              <Select 
                value={userFormData.role} 
                onValueChange={(v: UserRole) => setUserFormData({ ...userFormData, role: v })}
              >
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superuser">Superuser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={updateUserMutation.isPending} className="w-full">
                {updateUserMutation.isPending ? "Saving Changes..." : "Update User Details"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}