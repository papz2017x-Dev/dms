import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Category, Document } from "@/lib/api";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RotateCcw,
  ShieldCheck,
  FileText
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
    enabled: !!id,
    refetchInterval: 15000, // Live status updates
  });

  const { data: categories, isLoading: isCatLoading } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => api.getCategories(true),
    enabled: !!document
  });

  const { data: documentOwner } = useQuery({
    queryKey: ['users', document?.createdBy],
    queryFn: () => api.getUser(document!.createdBy),
    enabled: !!document?.createdBy
  });

  // Fetch all users mentioned in document history
  const historyUserIds = document?.history?.map(entry => entry.userId).filter(Boolean) || [];
  const { data: historyUsers } = useQuery({
    queryKey: ['users', 'batch', historyUserIds],
    queryFn: async () => {
      if (historyUserIds.length === 0) return {};
      const users = await api.getUsers();
      return users.reduce((acc, user) => {
        if (historyUserIds.includes(user.id)) {
          acc[user.id] = user;
        }
        return acc;
      }, {} as Record<string, typeof users[0]>);
    },
    enabled: !!document && historyUserIds.length > 0
  });

  // Fetch organization nodes for office information
  const { data: orgNodes } = useQuery({
    queryKey: ['org-nodes'],
    queryFn: api.getOrgNodes,
    enabled: !!historyUsers
  });

  // Create a map of office names by user officeId
  const officeMap = orgNodes?.reduce((acc, node) => {
    acc[node.id] = node.name;
    return acc;
  }, {} as Record<string, string>) || {};

  // Get audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs', id],
    queryFn: () => api.getAuditLogs(id!),
    enabled: !!id
  });

  const { data: categoryCreator } = useQuery({
    queryKey: ['users', categories?.find(c => c.id === document?.categoryId)?.createdBy],
    queryFn: async () => {
      const category = categories?.find(c => c.id === document?.categoryId);
      if (!category?.createdBy) return undefined;
      return api.getUser(category.createdBy);
    },
    enabled: !!document && !!categories
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

  const acceptStage = useMutation({
    mutationFn: api.acceptStage,
    onSuccess: (updatedDoc) => {
      queryClient.setQueryData(['documents', id], updatedDoc);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Document Accepted",
        description: `You have officially received and accepted this document.`,
      });
    },
  });

  if (isDocLoading || isCatLoading) return <div>Loading...</div>;
  if (!document) return <div>Document not found</div>;

  const currentUser = api.getCurrentUser();
  
  const category = categories?.find(c => c.id === document.categoryId);
  if (!category) return <div>Category not found</div>;

  const isCompleted = document.status === "completed";
  const currentStage = category.stages[document.currentStageIndex];
  const nextStage = !isCompleted && document.currentStageIndex < category.stages.length - 1
    ? category.stages[document.currentStageIndex + 1]
    : null;

  // Handshake & Permission Logic
  const isDraft = document.status === "draft";
  const isOwner = currentUser?.id === document.createdBy;
  const userOfficeName = currentUser?.officeId ? officeMap[currentUser.officeId] : undefined;
  
  let canAdvanceRegress = false;
  if (currentUser?.role === 'superuser') {
    canAdvanceRegress = true;
  } else if (isDraft && isOwner) {
    canAdvanceRegress = true; // Creator forwards draft
  } else if (!isDraft && isOwner && document.currentStageIndex === 0 && document.isAccepted === 1) {
    // Edge case if somehow the draft was skipped, but usually we don't pass here anymore
  } else if (!isDraft && userOfficeName && currentStage?.location === userOfficeName) {
    canAdvanceRegress = true; // Office designated for the current stage
  } else if (!isDraft && currentStage?.location?.toUpperCase() === "APPLICANT'S OFFICE" && isOwner) {
    canAdvanceRegress = true; // Special alias for the original sender's office
  }

  const isOverdue = new Date(document.targetDate) < new Date() && !isCompleted;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={currentUser?.role === "user" ? "/user-dashboard" : "/documents"}>
          <span className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> {currentUser?.role === "user" ? "Back to My Dashboard" : "Back to Documents"}
          </span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex flex-col mb-1">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Tracking No: {document.trackingNo}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
            <Badge variant="outline">{category.name}</Badge>
            {isCompleted && <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/20">Completed</Badge>}
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
          </div>
          {categoryCreator && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <User className="w-4 h-4" />
              <span>Workflow by {categoryCreator.fullName}</span>
            </div>
          )}
          <p className="text-xl font-medium mt-4 italic">
            {currentUser?.officeId === document.officeId || currentUser?.role === 'superuser' 
              ? document.subject 
              : "******** (Masked for Privacy)"}
            {currentUser?.officeId !== document.officeId && currentUser?.role !== 'superuser' && (
               <span className="ml-2 text-[10px] text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded-full">
                 <ShieldCheck className="w-3 h-3" /> Division Restricted
               </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canAdvanceRegress && (
            <>
              {isDraft ? (
                <Button
                  onClick={() => advanceStage.mutate(document.id)}
                  disabled={advanceStage.isPending}
                  className="min-w-[200px] bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {advanceStage.isPending ? "Submitting..." : "Submit to First Stage"}
                </Button>
              ) : (
                <>
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
                    <>
                      {document.isAccepted === 0 ? (
                        <Button
                          onClick={() => acceptStage.mutate(document.id)}
                          disabled={acceptStage.isPending}
                          className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                        >
                          {acceptStage.isPending ? "Accepting..." : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Accept Document
                            </>
                          )}
                        </Button>
                      ) : (
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
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="progress" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
              <TabsTrigger value="progress" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Workflow Progress</TabsTrigger>
              <TabsTrigger value="attachment" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Attachment</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Audit Trail</TabsTrigger>
            </TabsList>
            
            <TabsContent value="progress" className="mt-6">
              <Card className="border-none shadow-md bg-card/50">
                <CardHeader>
                  <CardTitle>Workflow Pipeline</CardTitle>
                  <CardDescription>Current status in the {category.name} process</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative py-4">
                    <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                    <div className="space-y-8">
                      {isDraft && (
                        <div className="relative flex gap-4 text-muted-foreground opacity-70">
                           <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed bg-background transition-all duration-500">
                             <span className="text-[10px]">P</span>
                           </div>
                           <div className="flex-1 pt-1">
                             <h4 className="text-sm font-bold">Preparation / Draft</h4>
                             <span className="text-[10px] uppercase tracking-widest font-bold">Unsubmitted</span>
                           </div>
                        </div>
                      )}
                      {category.stages.map((stage, index) => {
                        const isPast = !isDraft && index < document.currentStageIndex;
                        const isCurrent = !isDraft && index === document.currentStageIndex;
                        const isFuture = isDraft || index > document.currentStageIndex;

                        const historyEntry = document.history.findLast(h => h.stage === stage.name);
                        
                        // SLA Logic
                        let slaStatus: 'on-time' | 'delayed' | null = null;
                        if (isCurrent && !isCompleted && document.currentStageStartedAt && stage.slaHours) {
                          const hoursSpent = (Date.now() - new Date(document.currentStageStartedAt).getTime()) / (1000 * 60 * 60);
                          slaStatus = hoursSpent > stage.slaHours ? 'delayed' : 'on-time';
                        }

                        return (
                          <div key={stage.name} className="relative flex gap-4">
                            <div className={cn(
                              "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500",
                              isPast || (isCompleted && isCurrent) ? "border-primary bg-primary text-primary-foreground shadow-lg" :
                              isCurrent && !isCompleted ? (
                                slaStatus === 'delayed' ? "border-destructive bg-destructive text-destructive-foreground ring-4 ring-destructive/20" :
                                "border-primary bg-background text-foreground ring-4 ring-primary/20 scale-110"
                              ) : "border-muted bg-background text-muted-foreground"
                            )}>
                              {isPast || (isCompleted && isCurrent) ? <CheckCircle2 className="h-4 w-4" /> :
                                isCurrent ? (slaStatus === 'delayed' ? <AlertTriangle className="h-4 w-4" /> : <Circle className="h-4 w-4 fill-primary" />) :
                                <span className="text-xs">{index + 1}</span>}
                            </div>

                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <h4 className={cn("text-sm font-bold", isFuture && "text-muted-foreground")}>
                                    {stage.name}
                                  </h4>
                                  {stage.location && (
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                      {stage.location}
                                    </span>
                                  )}
                                  {stage.slaHours && (
                                    <Badge variant="outline" className="w-fit text-[9px] h-4 mt-1 font-black opacity-70">
                                      {stage.slaHours}H SLA
                                    </Badge>
                                  )}
                                </div>
                                {historyEntry && (
                                  <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                    {format(new Date(historyEntry.timestamp), "MMM d, h:mm a")}
                                  </span>
                                )}
                              </div>
                              {isCurrent && !isCompleted && (
                                <div className={cn(
                                  "mt-2 p-3 rounded-xl border flex items-center justify-between",
                                  slaStatus === 'delayed' ? "bg-red-50 border-red-100 text-red-700" : 
                                  document.isAccepted === 0 ? "bg-amber-50 border-amber-100 text-amber-700" :
                                  "bg-primary/5 border-primary/10 text-primary"
                                )}>
                                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                    {document.isAccepted === 0 ? (
                                      <>
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Pending Receipt
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5" />
                                        {slaStatus === 'delayed' ? "Critical Delay" : "Processing"}
                                      </>
                                    )}
                                  </div>
                                  {document.currentStageStartedAt && (
                                    <span className="text-[10px] font-black opacity-60 italic">
                                      {document.isAccepted === 0 ? "Forwarded " : "Started "} 
                                      {formatDistanceToNow(new Date(document.currentStageStartedAt), { addSuffix: true })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Immutable Audit Trail</CardTitle>
                  <CardDescription>Comprehensive log of all document actions and transitions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {auditLogs?.map((log, i) => (
                        <div key={log.id} className="relative pl-6 pb-6 border-l-2 border-muted last:pb-0">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 border-4 border-background" />
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-black text-primary uppercase tracking-tighter">{log.action}</span>
                            <span className="text-[10px] font-medium text-muted-foreground opacity-70">
                              {format(new Date(log.createdAt), "MMM d, yyyy • h:mm a")}
                            </span>
                          </div>
                          {log.details && (
                            <div className="bg-muted/30 p-2 rounded text-[11px] font-mono whitespace-pre-wrap mt-1 border border-muted-foreground/10">
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachment" className="mt-6">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Document Attachment</CardTitle>
                  <CardDescription>View the scanned photo or attached file for this document.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!document.attachmentUrl ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                      <FileText className="w-12 h-12 mb-2 opacity-50" />
                      <p>No attachment uploaded for this document.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border">
                      {document.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                        <div className="flex justify-center bg-black/5 p-4">
                          <img 
                            src={document.attachmentUrl} 
                            alt="Document Attachment" 
                            className="max-w-full max-h-[600px] object-contain rounded shadow-sm border bg-white"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-muted/10">
                          <FileText className="w-16 h-16 text-primary/40 mb-4" />
                          <p className="font-medium mb-2 text-foreground">File Attachment</p>
                          <a href={document.attachmentUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline">
                              View / Download File
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
                  <span className="text-sm font-medium">
                    {documentOwner?.fullName || 'Unknown User'}
                  </span>
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
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {[...document.history].reverse().map((entry, i) => {
                    const user = entry.userId ? historyUsers?.[entry.userId] : undefined;
                    const officeName = user?.officeId ? officeMap[user.officeId] : undefined;
                    return (
                      <div key={i} className="flex gap-3 pb-6 border-b last:border-0 last:pb-0 relative">
                        {/* Visual Indicator */}
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                          {i !== document.history.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-sm font-semibold text-foreground leading-none">{entry.stage}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                            </span>
                          </div>

                          {user && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5 font-medium text-foreground/70">
                                <User className="w-3.5 h-3.5 text-primary/70" />
                                <span>{user.fullName}</span>
                              </div>
                              {(user.position || officeName) && (
                                <div className="flex items-center gap-1.5 text-[11px] font-medium bg-primary/10 px-2 py-0.5 rounded border border-primary/20 text-primary">
                                  <span>{user.position}{user.position && officeName ? " • " : ""}{officeName}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {entry.note && (
                            <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-primary/30 mt-2">
                              <p className="text-xs text-muted-foreground leading-relaxed italic">
                                "{entry.note}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
