import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminDocuments() {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["admin-rag-documents"],
    queryFn: () => api.getAdminRagDocuments(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadRagDocument(file, title || undefined, department || undefined, course || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-rag-documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success(`Uploaded. Indexed ${data.chunksIndexed} chunks.`);
      setTitle("");
      setDepartment("");
      setCourse("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const handleUpload = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">Upload documents so Ask AI and Smart Quiz can use them</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Title (optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Department (optional)</label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. IT"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Course (optional)</label>
              <Input
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. CS101"
                className="mt-1"
              />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={onFileChange}
          />
          <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="gap-2">
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? "Uploading & indexing…" : "Upload PDF/DOCX/TXT"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Indexed Documents</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.chunksCount} chunks • {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
