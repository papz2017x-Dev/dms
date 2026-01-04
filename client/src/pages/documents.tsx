import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Category, Document } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Calendar as CalendarIcon, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight,
  Eye,
  Trash
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

const documentSchema = z.object({
  title: z.string().min(2, "Title is required"),
  subject: z.string().min(5, "Subject is required"),
  categoryId: z.string().min(1, "Category is required"),
  targetDate: z.date({ required_error: "Target date is required" }),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

export default function Documents() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const isNew = searchParams.get('new') === 'true';

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(isNew);

  const { data: documents, isLoading } = useQuery({ 
    queryKey: ['documents'], 
    queryFn: api.getDocuments 
  });

  const { data: categories } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: api.getCategories 
  });

  const createDocument = useMutation({
    mutationFn: (data: DocumentFormValues) => api.createDocument({
      ...data,
      targetDate: data.targetDate.toISOString(),
    }),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsCreateOpen(false);
      toast({
        title: "Document created",
        description: "Document has been initialized in the first workflow stage.",
      });
      setLocation(`/documents/${newDoc.id}`);
    },
  });

   const deleteDocument = useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Document deleted",
        variant: "destructive",
      });
    },
  });

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      subject: "",
      categoryId: "",
    },
  });

  const onSubmit = (data: DocumentFormValues) => {
    createDocument.mutate(data);
  };

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || 
                            doc.subject.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || doc.categoryId === categoryFilter;
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [documents, search, categoryFilter, statusFilter]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-2">Manage and track document progress.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Start a new document workflow.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Document Title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                <DialogFooter>
                  <Button type="submit">Create Document</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stage</TableHead>
              <TableHead>Target Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
               <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => {
                const category = categories?.find(c => c.id === doc.categoryId);
                const stage = category?.stages[doc.currentStageIndex];
                const stageName = stage?.name;
                const progress = category ? ((doc.currentStageIndex + 1) / category.stages.length) * 100 : 0;
                const isOverdue = new Date(doc.targetDate) < new Date() && doc.status !== 'completed';

                return (
                  <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setLocation(`/documents/${doc.id}`)}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{doc.title}</span>
                        <span className="text-xs text-muted-foreground">{doc.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category?.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-col">
                          <span className="text-sm">{stageName}</span>
                          {stage?.location && (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{stage.location}</span>
                          )}
                        </div>
                        <div className="h-1.5 w-24 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("text-sm", isOverdue ? "text-destructive font-medium" : "")}>
                         {format(new Date(doc.targetDate), "MMM d, yyyy")}
                         {isOverdue && <span className="ml-2 text-xs bg-destructive/10 px-1.5 py-0.5 rounded">Overdue</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/documents/${doc.id}`); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                            e.stopPropagation();
                            if(confirm('Are you sure you want to delete this document?')) deleteDocument.mutate(doc.id);
                          }}>
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
