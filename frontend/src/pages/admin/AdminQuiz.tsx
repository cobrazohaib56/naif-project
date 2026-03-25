import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Brain, Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminQuiz() {
  const queryClient = useQueryClient();
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes-admin"],
    queryFn: () => api.getQuizzes(true),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTimeLimit, setFormTimeLimit] = useState("");
  const [formActive, setFormActive] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createQuiz(
        formTitle || "Untitled Quiz",
        formDescription || undefined,
        formTimeLimit ? parseInt(formTimeLimit, 10) : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes-admin"] });
      setCreateOpen(false);
      setFormTitle("");
      setFormDescription("");
      setFormTimeLimit("");
      toast.success("Quiz created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof api.updateQuiz>[1] }) =>
      api.updateQuiz(id, updates!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes-admin"] });
      setEditOpen(false);
      setEditingQuizId(null);
      toast.success("Quiz updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteQuiz(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes-admin"] });
      toast.success("Quiz deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const openEdit = (quiz: { id: string; title: string; description?: string | null; time_limit_minutes?: number | null; is_active: boolean }) => {
    setEditingQuizId(quiz.id);
    setFormTitle(quiz.title);
    setFormDescription(quiz.description ?? "");
    setFormTimeLimit(quiz.time_limit_minutes != null ? String(quiz.time_limit_minutes) : "");
    setFormActive(quiz.is_active);
    setEditOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuizId) return;
    updateMutation.mutate({
      id: editingQuizId,
      updates: {
        title: formTitle,
        description: formDescription || undefined,
        time_limit_minutes: formTimeLimit ? parseInt(formTimeLimit, 10) : undefined,
        is_active: formActive,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Quiz Manager</h1>
          <p className="text-muted-foreground mt-1">View and manage quizzes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="create-title">Title</Label>
                <Input
                  id="create-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Quiz title"
                />
              </div>
              <div>
                <Label htmlFor="create-desc">Description (optional)</Label>
                <Input
                  id="create-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <div>
                <Label htmlFor="create-time">Time limit (minutes, optional)</Label>
                <Input
                  id="create-time"
                  type="number"
                  min={1}
                  value={formTimeLimit}
                  onChange={(e) => setFormTimeLimit(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Brain className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      quiz.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {quiz.is_active ? "Active" : "Draft"}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{quiz.questions} questions</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => openEdit({ ...quiz, description: quiz.description ?? null, time_limit_minutes: quiz.time_limit_minutes ?? null })}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      updateMutation.mutate({
                        id: quiz.id,
                        updates: { is_active: !quiz.is_active },
                      })
                    }
                    disabled={updateMutation.isPending}
                  >
                    {quiz.is_active ? (
                      <>
                        <PowerOff className="h-3 w-3" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Power className="h-3 w-3" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm("Delete this quiz? This cannot be undone.")) {
                        deleteMutation.mutate(quiz.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit quiz</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Quiz title"
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description (optional)</Label>
              <Input
                id="edit-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label htmlFor="edit-time">Time limit (minutes, optional)</Label>
              <Input
                id="edit-time"
                type="number"
                min={1}
                value={formTimeLimit}
                onChange={(e) => setFormTimeLimit(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border"
              />
              <Label htmlFor="edit-active">Published (visible to students)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!isLoading && quizzes.length === 0 && (
        <p className="text-muted-foreground">No quizzes. Create one with the button above.</p>
      )}
    </div>
  );
}
