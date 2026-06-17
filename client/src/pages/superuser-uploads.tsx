import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";

type UploadFile = {
  name: string;
  url: string;
  size: number;
  mtime: string;
};

async function fetchUploads(): Promise<UploadFile[]> {
  const res = await fetch("/api/uploads");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function SuperuserUploads() {
  const user = api.getCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
    if (user?.role !== "superuser") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: uploads = [], isLoading } = useQuery({ queryKey: ["uploads"], queryFn: fetchUploads });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/uploads/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uploads"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Uploaded Files</h1>
        <p className="text-muted-foreground">View and remove uploaded attachments.</p>
      </div>

      <div className="rounded-md border bg-card p-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((f) => (
                <TableRow key={f.name}>
                  <TableCell>
                    {f.url.endsWith(".jpg") || f.url.endsWith(".png") || f.url.endsWith(".jpeg") ? (
                      <img src={f.url} alt={f.name} className="h-12 w-20 object-cover rounded" />
                    ) : (
                      <div className="text-sm text-muted-foreground">No preview</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{f.name}</TableCell>
                  <TableCell>{(f.size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>{format(new Date(f.mtime), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={f.url} target="_blank" rel="noreferrer">
                        <Button variant="outline">Open</Button>
                      </a>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Delete ${f.name}? This cannot be undone.`)) {
                            deleteMutation.mutate(f.name);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
