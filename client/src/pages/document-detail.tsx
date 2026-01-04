import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Category, Document } from "@/lib/api";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Calendar,
  Clock,
  User,
  History,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function DocumentDetail() {
  const [match, params] = useRoute("/documents/:id");
  const id = params?.id;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: document, isLoading: isDocLoading } = useQuery({ 
    queryKey: ['documents', id], 
    queryFn: () => api.getDocument(id!),
    enabled: !!id
  });

  const { data: categories, isLoading: isCatLoading } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: api.getCategories,
    enabled: !!document
  });

  const advanceStage = useMutation({
    mutationFn: api.advanceStage,
    onSuccess: (updatedDoc) => {
      queryClient.setQueryData(['documents', id], updatedDoc);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Stage Advanced",
        description: `Document moved to next stage.`,
      });
    },
  });
  
  const regressStage = useMutation({
    mutationFn: api.regressStage,
    onSuccess: (updatedDoc) => {
      queryClient.setQueryData(['documents', id], updatedDoc);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Stage Regressed",
        description: `Document moved back to previous stage.`,
      });
    },
  });

  if (isDocLoading || isCatLoading) return <div>Loading...</div>;
  if (!document) return <div>Document not found</div>;

  const category = categories?.find(c => c.id === document.categoryId);
  if (!category) return <div>Category not found</div>;

  const isCompleted = document.status === "completed";
  const currentStage = category.stages[document.currentStageIndex];
  const nextStage = !isCompleted && document.currentStageIndex < category.stages.length - 1 
    ? category.stages[document.currentStageIndex + 1] 
    : null;

  const isOverdue = new Date(document.targetDate) < new Date() && !isCompleted;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/documents">
          <span className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> Back to Documents
          </span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
            <Badge variant="outline">{category.name}</Badge>
            {isCompleted && <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/20">Completed</Badge>}
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
          </div>
          <p className="text-lg text-muted-foreground">{document.subject}</p>
        </div>

        <div className="flex items-center gap-2">
            {!isCompleted && document.currentStageIndex > 0 && (
            <Button 
                variant="outline" 
                onClick={() => regressStage.mutate(document.id)}
                disabled={regressStage.isPending}
            >
                <RotateCcw className="w-4 h-4 mr-2" />
                Previous Stage
            </Button>
            )}
            
          {!isCompleted && (
            <Button 
              onClick={() => advanceStage.mutate(document.id)}
              disabled={advanceStage.isPending}
              className="min-w-[160px]"
            >
              {advanceStage.isPending ? "Processing..." : (
                <>
                  {nextStage ? "Advance Stage" : "Mark Completed"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Progress</CardTitle>
              <CardDescription>Current status in the {category.name} pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative py-4">
                {/* Connector Line */}
                <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

                <div className="space-y-8">
                  {category.stages.map((stage, index) => {
                    const isPast = index < document.currentStageIndex;
                    const isCurrent = index === document.currentStageIndex;
                    const isFuture = index > document.currentStageIndex;
                    
                    const historyEntry = document.history.findLast(h => h.stage === stage.name);
                    
                    return (
                      <div key={stage.name} className="relative flex gap-4">
                        <div 
                          className={cn(
                            "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                            isPast || (isCompleted && isCurrent) ? "border-primary bg-primary text-primary-foreground" :
                            isCurrent && !isCompleted ? "border-primary bg-background text-foreground ring-4 ring-primary/20" :
                            "border-muted bg-background text-muted-foreground"
                          )}
                        >
                          {isPast || (isCompleted && isCurrent) ? <CheckCircle2 className="h-4 w-4" /> : 
                           isCurrent ? <Circle className="h-4 w-4 fill-primary" /> :
                           <span className="text-xs">{index + 1}</span>}
                        </div>
                        
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <h4 className={cn("text-sm font-semibold", isFuture && "text-muted-foreground")}>
                                {stage.name}
                              </h4>
                              {stage.location && (
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                  {stage.location}
                                </span>
                              )}
                            </div>
                            {historyEntry && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(historyEntry.timestamp), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                          {isCurrent && !isCompleted && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Current Stage - Awaiting action
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Target Date</span>
                  <span className={cn("text-sm font-medium", isOverdue && "text-destructive")}>
                    {format(new Date(document.targetDate), "PPP")}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Created On</span>
                  <span className="text-sm font-medium">
                    {format(new Date(document.createdAt), "PPP")}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Owner</span>
                  <span className="text-sm font-medium">Jane Doe</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4" /> History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-4">
                  {[...document.history].reverse().map((entry, i) => (
                    <div key={i} className="flex flex-col space-y-1 pb-4 border-b last:border-0 last:pb-0">
                      <span className="text-sm font-medium">{entry.stage}</span>
                       {entry.note && (
                            <span className="text-xs text-muted-foreground italic">Note: {entry.note}</span>
                        )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
