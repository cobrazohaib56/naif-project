import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, FileText, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const Notes = () => {
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api.getNotes(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadNote(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note uploaded successfully");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    },
  });

  const filtered = notes.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const getColor = (i: number) => {
    const colors = ["bg-rose-50 text-rose-500", "bg-violet-50 text-violet-500", "bg-blue-50 text-primary", "bg-green-50 text-success", "bg-amber-50 text-amber-500", "bg-cyan-50 text-cyan-500"];
    return colors[i % colors.length];
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Notes</h1>
          <p className="text-muted-foreground mt-1">Manage and review your uploaded documents</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            className="gap-2 shadow-sm"
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
          >
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? "Uploading..." : "Upload Note"}
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading notes...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((note, i) => (
            <Link to={`/notes/${note.id}`} key={note.id}>
              <Card className="shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${getColor(i)}`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      {note.summarized && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                          Summarized
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, note.id, note.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{note.name}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{formatDate(note.date)}</span>
                    <span>&bull;</span>
                    <span>{note.fileType}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <p className="text-muted-foreground">No notes match your search.</p>
      )}
    </div>
  );
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default Notes;
