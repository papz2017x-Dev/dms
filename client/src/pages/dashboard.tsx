import { useQuery } from "@tanstack/react-query";
import { api, Document, Category } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { FileText, CheckCircle, Clock, AlertCircle, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const [filter, setFilter] = useState<string | null>(null);

  const { data: documents } = useQuery({ 
    queryKey: ['documents'], 
    queryFn: api.getDocuments 
  });

  const { data: categories } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: api.getCategories 
  });

  const processedDocs = useMemo(() => {
    if (!documents || !categories) return [];
    
    return documents.map(doc => {
      const category = categories.find(c => c.id === doc.categoryId);
      let status: 'completed' | 'delayed' | 'active' = 'active';
      
      if (doc.status === 'completed') {
        status = 'completed';
      } else if (doc.status === 'active' && doc.currentStageStartedAt) {
        const stage = category?.stages[doc.currentStageIndex];
        if (stage?.slaHours) {
          const startTime = new Date(doc.currentStageStartedAt).getTime();
          const hoursSpent = (Date.now() - startTime) / (1000 * 60 * 60);
          if (hoursSpent > stage.slaHours) {
            status = 'delayed';
          }
        }
      }

      return { ...doc, calcStatus: status, categoryName: category?.name };
    });
  }, [documents, categories]);

  const stats = useMemo(() => ({
    total: processedDocs.length,
    completed: processedDocs.filter(d => d.calcStatus === 'completed').length,
    active: processedDocs.filter(d => d.calcStatus === 'active').length,
    delayed: processedDocs.filter(d => d.calcStatus === 'delayed').length,
  }), [processedDocs]);

  const chartData = [
    { name: 'Completed', value: stats.completed, color: 'hsl(142, 71%, 45%)' },
    { name: 'Active', value: stats.active, color: 'hsl(45, 93%, 47%)' },
    { name: 'Delayed', value: stats.delayed, color: 'hsl(0, 84%, 60%)' },
  ].filter(d => d.value > 0);

  const filteredDocs = filter 
    ? processedDocs.filter(d => d.calcStatus === filter) 
    : processedDocs;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Executive Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">System-wide document performance and SLA compliance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
            filter === null && "ring-2 ring-primary"
          )}
          onClick={() => setFilter(null)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Requests</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.total}</div>
            <div className="mt-4 h-1 w-full bg-primary/10 rounded-full overflow-hidden">
               <div className="h-full bg-primary" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-l-4 border-l-green-500",
            filter === 'completed' && "ring-2 ring-green-500"
          )}
          onClick={() => setFilter('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Smooth Flow</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-l-4 border-l-yellow-500",
            filter === 'active' && "ring-2 ring-yellow-500"
          )}
          onClick={() => setFilter('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Processing</CardTitle>
            <Clock className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-yellow-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Within SLA limits</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
             "relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-l-4 border-l-destructive shadow-sm",
             filter === 'delayed' && "ring-2 ring-destructive"
          )}
          onClick={() => setFilter('delayed')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Critical Delay</CardTitle>
            <AlertCircle className="h-5 w-5 text-destructive animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-destructive">{stats.delayed}</div>
            <p className="text-xs text-muted-foreground mt-1 text-destructive/80 font-medium">Exceeded SLA targets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-xl border-none bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Workflow Health</CardTitle>
            </div>
            <CardDescription>Visual distribution of document statuses across the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 text-sm">
                {chartData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 font-medium">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}: {((d.value / stats.total) * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-xl border-none overflow-hidden">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{filter ? `${filter.charAt(0).toUpperCase() + filter.slice(1)} Items` : "Recent Activity"}</CardTitle>
                <CardDescription>Tracking real-time document movement.</CardDescription>
              </div>
              {filter && (
                <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>Clear</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted max-h-[450px] overflow-auto">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic">No matching documents found.</div>
              ) : (
                filteredDocs.slice(0, 8).map(doc => (
                  <Link key={doc.id} href={`/documents/${doc.id}`}>
                    <div className="p-4 hover:bg-muted/50 cursor-pointer flex items-center gap-4 transition-colors group">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                         doc.calcStatus === 'completed' ? "bg-green-100 text-green-600" :
                         doc.calcStatus === 'delayed' ? "bg-red-100 text-red-600" :
                         "bg-yellow-100 text-yellow-600"
                      )}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{doc.title}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {doc.categoryName} • Stage {doc.currentStageIndex + 1}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">
                          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                        </div>
                        <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {filteredDocs.length > 0 && (
              <div className="p-4 bg-muted/20 border-t">
                <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary" asChild>
                  <Link href="/documents">
                    <span className="cursor-pointer">Full Library View</span>
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
