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
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(5, "Description is required"),
  stages: z.array(z.object({ value: z.string().min(1, "Stage name required") })).min(2, "At least 2 stages required"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Categories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: categories, isLoading } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: api.getCategories 
  });

  const createCategory = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsOpen(false);
      toast({
        title: "Category created",
        description: "New workflow category has been set up successfully.",
      });
    },
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      stages: [{ value: "Draft" }, { value: "Review" }, { value: "Approved" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stages",
  });

  const onSubmit = (data: CategoryFormValues) => {
    createCategory.mutate({
      name: data.name,
      description: data.description,
      stages: data.stages.map(s => s.value),
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>
                Define a new document type and its linear workflow stages.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel>Workflow Stages</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => append({ value: "" })}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Stage
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                         <div className="bg-muted w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                           {index + 1}
                         </div>
                         <FormField
                            control={form.control}
                            name={`stages.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1 mb-0">
                                <FormControl>
                                  <Input placeholder={`Stage ${index + 1}`} {...field} className="h-8" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          {fields.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stages define the linear progression of a document from start to finish.
                  </p>
                </div>

                <DialogFooter>
                  <Button type="submit">Create Workflow</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <Card key={category.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{category.name}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Workflow Stages</h4>
              <div className="space-y-4 relative">
                 <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                 {category.stages.map((stage, idx) => (
                   <div key={idx} className="flex items-center gap-3 relative z-10">
                     <div className="w-6 h-6 rounded-full border bg-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                       {idx + 1}
                     </div>
                     <span className="text-sm">{stage}</span>
                   </div>
                 ))}
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 bg-muted/20">
              <div className="text-xs text-muted-foreground w-full flex justify-between">
                <span>{category.stages.length} Stages</span>
                <span>ID: {category.id}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
