import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type Document, type User } from "@/lib/api";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ensureCameraPermission } from "@/lib/nativePermissions";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Bell, 
  User as UserIcon, 
  Lock, 
  Settings,
  ChevronRight,
  Clock,
  CheckCircle,
  Trash2,
  XCircle,
  Edit2,
  CalendarIcon,
  MoreVertical
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";

const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  categoryId: z.string().min(1, "Category is required"),
  targetDate: z.date({
    required_error: "Target completion date is required",
  }),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = api.getCurrentUser();
  const [activeTab, setActiveTab] = useState<"documents" | "notifications" | "settings">("documents");

  const deleteDocumentMutation = useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      toast({ title: "Document cancelled successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: (data: { id: string, updates: Partial<Document> }) => api.updateDocument(data.id, data.updates),
    onSuccess: () => {
      toast({ title: "Document updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setEditingDoc(null);
    }
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: api.getDocuments,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => api.getCategories(true),
  });

  const myDocuments = documents.filter(d => d.createdBy === currentUser?.id);
  
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const editForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
  });

  const handleEditClick = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDoc(doc);
    editForm.reset({
      title: doc.title,
      subject: doc.subject,
      categoryId: doc.categoryId,
      targetDate: new Date(doc.targetDate)
    });
    setAttachmentFile(null);
  };

  const onEditSubmit = async (data: DocumentFormValues) => {
    if (!editingDoc) return;
    
    try {
      if (attachmentFile) {
        await api.uploadDocumentAttachment(editingDoc.id, attachmentFile);
      }
      updateDocumentMutation.mutate({
        id: editingDoc.id,
        updates: {
          title: data.title,
          subject: data.subject,
          categoryId: data.categoryId,
          targetDate: data.targetDate.toISOString()
        }
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to upload attachment.", variant: "destructive" });
    }
  };

  const { data: trueNotifications = [] } = useQuery({
    queryKey: ["/api/notifications", currentUser?.id],
    queryFn: () => api.getNotifications(),
    enabled: !!currentUser,
    refetchInterval: 10000,
  });

  const unreadCount = trueNotifications.filter(n => n.isRead === 0).length;

  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || "",
    username: currentUser?.username || "",
    password: "",
    confirmPassword: ""
  });

  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<User & { password?: string }>) => 
      api.updateUser(currentUser!.id, updates),
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      setProfileForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }

    const updates: any = {
      fullName: profileForm.fullName,
      username: profileForm.username,
    };
    if (profileForm.password) updates.password = profileForm.password;

    updateProfileMutation.mutate(updates);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <UserIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your documents and account settings</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b pb-px">
        {[
          { id: "documents", label: "My Documents", icon: FileText },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "settings", label: "Account Settings", icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.id === "notifications" && unreadCount > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {unreadCount}
              </span>
            )}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      {activeTab === "documents" && (
        <Card>
          <CardHeader>
            <CardTitle>My Documents</CardTitle>
            <CardDescription>Documents you have created</CardDescription>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="h-32 flex items-center justify-center">Loading...</div>
            ) : myDocuments.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="h-8 w-8 mb-2 opacity-20" />
                <p>You haven't created any documents yet.</p>
                <Link href="/documents">
                  <Button variant="link" className="mt-2">Create your first document</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking No</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myDocuments.map((doc) => (
                    <TableRow 
                      key={doc.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setLocation(`/documents/${doc.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{doc.trackingNo}</TableCell>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                          doc.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                          doc.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {doc.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => setLocation(`/documents/${doc.id}`)}
                            >
                              <FileText className="h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {doc.status !== 'completed' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                                  onClick={(e) => handleEditClick(doc, e)}
                                >
                                  <Edit2 className="h-4 w-4" /> Edit Document
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if(confirm('Are you sure you want to cancel/delete this document? This cannot be undone.')) {
                                      deleteDocumentMutation.mutate(doc.id);
                                    }
                                  }}
                                >
                                  {doc.status === 'draft' ? <Trash2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                  {doc.status === 'draft' ? "Delete Draft" : "Cancel Document"}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Updates on documents you are involved in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trueNotifications.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No recent updates.</p>
              ) : (
                trueNotifications.map((n) => (
                  <div key={n.id} className={`flex gap-4 p-3 rounded-lg transition-colors group ${n.isRead === 0 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'}`}>
                    <div className="mt-1">
                      {n.message.toLowerCase().includes('completed') ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Bell className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {n.documentId && (
                      <Link href={`/documents/${n.documentId}`}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "settings" && (
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details and password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Change Password
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        placeholder="••••••••"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    Leave password fields blank if you don't want to change it.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Modify the details of your document here.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Leave Application" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workflow category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Target Completion Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Replace Attachment (Optional)</Label>
                <Input 
                  type="file" 
                  accept="image/*,.pdf,.doc,.docx" 
                  capture="environment"
                  onClick={async (e) => {
                    const ok = await ensureCameraPermission();
                    if (!ok) {
                      e.preventDefault();
                      toast({ title: "Permission required", description: "Camera permission was not granted.", variant: "destructive" });
                      return;
                    }
                  }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setAttachmentFile(e.target.files[0]);
                    } else {
                      setAttachmentFile(null);
                    }
                  }} 
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Upload a new file or take a photo to replace the current attachment. Leave blank to keep existing.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingDoc(null)}>Cancel</Button>
                <Button type="submit" disabled={updateDocumentMutation.isPending}>
                  {updateDocumentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}