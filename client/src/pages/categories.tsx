import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Category } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, Trash, MoreVertical, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(5, "Description is required"),
  stages: z.array(z.object({ 
    value: z.string().min(1, "Stage name required"),
    location: z.string().min(1, "Office selection required"),
    slaHours: z.preprocess((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }, z.number().optional()),
  })).min(1, "At least one stage required"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Categories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = api.getCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: api.getCategories 
  });

  const { data: orgNodes } = useQuery({
    queryKey: ['org-nodes'],
    queryFn: api.getOrgNodes
  });

  const officeMap = orgNodes?.reduce((acc, node) => {
    acc[node.id] = node.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers
  });

  const usersMap = users?.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {} as Record<string, any>) || {};

  const createCategory = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsOpen(false);
      setEditingCategory(null);
      toast({
        title: "Category created",
        description: "New workflow category has been set up successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Creation failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => api.updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsOpen(false);
      setEditingCategory(null);
      toast({
        title: "Category updated",
        description: "The workflow category has been updated successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const deleteCategory = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Category deleted",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      stages: [
        { value: "Draft", location: "", slaHours: undefined }, 
        { value: "Review", location: "", slaHours: undefined }, 
        { value: "Approved", location: "", slaHours: undefined }
      ],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "stages",
  });

  useEffect(() => {
    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        description: editingCategory.description,
        stages: editingCategory.stages.map((s) => ({ 
          value: s.name, 
          location: s.location || "",
          slaHours: s.slaHours ?? undefined
        })),
      });
    } else {
      form.reset({
        name: "",
        description: "",
        stages: [
          { value: "Draft", location: currentUser?.officeId ? officeMap[currentUser.officeId] : "", slaHours: undefined }, 
          { value: "Review", location: "", slaHours: undefined }, 
          { value: "Approved", location: "", slaHours: undefined }
        ],
      });
    }
  }, [editingCategory, form, currentUser, orgNodes]);

  const onSubmit = (data: CategoryFormValues) => {
    const payload = {
      name: data.name,
      description: data.description,
      stages: data.stages.map(s => ({ 
        name: s.value, 
        location: s.location || undefined,
        slaHours: s.slaHours ?? undefined
      })),
      officeId: currentUser?.officeId || undefined
    };

    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, updates: payload });
    } else {
      createCategory.mutate(payload);
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check the form for missing or incorrect fields.",
      variant: "destructive",
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-2">Manage document categories and their workflow stages.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(val) => {
          setIsOpen(val);
          if (!val) {
            setEditingCategory(null);
            form.reset({
              name: "",
              description: "",
              stages: [
                { value: "Draft", location: currentUser?.officeId ? officeMap[currentUser.officeId] : "", slaHours: undefined }, 
                { value: "Review", location: "", slaHours: undefined }, 
                { value: "Approved", location: "", slaHours: undefined }
              ],
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
              <DialogDescription>
                Define your document type and its linear workflow stages.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Legal Contracts" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What is this category for?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Workflow Stages</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => append({ value: "", location: "", slaHours: undefined })}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Stage
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-3 border rounded-lg bg-muted/10 space-y-3 relative group/stage">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest opacity-50">Stage Configuration</span>
                          </div>
                          {fields.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover/stage:opacity-100 transition-opacity"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-3">
                          <FormField
                            control={form.control}
                            name={`stages.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground/70">Stage Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Draft, Approval" {...field} className="h-9 bg-background" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`stages.${index}.location`}
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground/70">Responsible Office</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-9 bg-background">
                                        <SelectValue placeholder="Select Office" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {orgNodes?.map((node) => (
                                        <SelectItem key={node.id} value={node.name}>{node.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`stages.${index}.slaHours`}
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground/70">SLA (Hours)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input type="number" placeholder="48" {...field} className="h-9 bg-background pl-8" />
                                      <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground opacity-40" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Stages define the linear progression of a document from start to finish.
                  </p>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full h-11" disabled={createCategory.isPending || updateCategory.isPending}>
                    {editingCategory ? "Update Application Workflow" : "Create Workflow Strategy"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => {
          const creator = category.createdBy ? usersMap[category.createdBy] : null;
          return (
            <Card key={category.id} className="flex flex-col group hover:shadow-xl transition-all duration-300 border-muted/40 overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold tracking-tight text-primary/90">{category.name}</CardTitle>
                    {currentUser?.role === "superuser" && category.officeId && (
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-widest font-black h-4 px-1.5 bg-primary/10 text-primary border-none">
                        {officeMap[category.officeId] || "Office"}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
                      Authored By: <span className="text-foreground">{creator?.fullName || "System Admin"}</span>
                    </span>
                    {creator?.officeId && (
                      <span className="text-[10px] text-primary/70 font-black uppercase tracking-tighter">
                        {officeMap[creator.officeId] || "General Office"}
                      </span>
                    )}
                  </div>
                  
                  <CardDescription className="text-[13px] leading-relaxed pt-2 text-foreground/70">
                    {category.description}
                  </CardDescription>
                </div>
                {((currentUser?.role === "superuser" && !category.officeId) || 
                  (currentUser?.role === "admin" && currentUser.officeId === category.officeId)) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => {
                        setEditingCategory(category);
                        setIsOpen(true);
                      }}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Flow
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => {
                        if (confirm(`Are you sure you want to delete "${category.name}"? All associated documents will also be deleted.`)) {
                          deleteCategory.mutate(category.id);
                        }
                      }}>
                        <Trash className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent className="flex-1 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.2em]">Operational Stages</span>
                  <div className="h-px bg-border flex-1 opacity-50" />
                </div>
                
                <div className="space-y-5 relative pl-4">
                   <div className="absolute left-[20px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
                   {category.stages.map((stage, idx) => (
                     <div key={idx} className="relative z-10 flex flex-col gap-1">
                       <div className="absolute -left-9 top-1 w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-sm">
                         {idx + 1}
                       </div>
                       
                       <div className="flex items-center justify-between gap-2 ml-1">
                          <span className="text-sm font-semibold leading-tight text-foreground/90">{stage.name}</span>
                          {stage.slaHours && (
                            <Badge variant="outline" className="text-[9px] h-4 font-black bg-muted/30 border-none px-1.5">
                              {stage.slaHours}H SLA
                            </Badge>
                          )}
                        </div>
                        
                        {stage.location && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-widest opacity-60">
                              <Clock className="w-3 h-3 opacity-50" />
                              {stage.location}
                            </span>
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              </CardContent>
              <CardFooter className="border-t border-muted/40 p-4 bg-muted/10">
                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 w-full flex justify-between">
                  <span>{category.stages.length} Workflow Nodes</span>
                  <span>ID: {category.id.split('-')[0].toUpperCase()}</span>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
