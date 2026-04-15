import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Plus, Pencil, Trash2, Power, PowerOff, ListChecks, Sparkles, X } from "lucide-react";
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
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [managingQuizId, setManagingQuizId] = useState<string | null>(null);
  const [managingQuizTitle, setManagingQuizTitle] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTimeLimit, setFormTimeLimit] = useState("");
  const [formActive, setFormActive] = useState(false);

  // Manual question form
  const [manualQuestion, setManualQuestion] = useState("");
  const [manualOptions, setManualOptions] = useState(["", "", "", ""]);
  const [manualCorrect, setManualCorrect] = useState(0);

  // AI generate form
  const [aiText, setAiText] = useState("");
  const [aiNumQuestions, setAiNumQuestions] = useState("5");
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<
    { questionText: string; options: string[]; correctAnswer: string; type: string }[]
  >([]);

  const { data: quizDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["quiz-detail-admin", managingQuizId],
    queryFn: () => api.getQuiz(managingQuizId!, true),
    enabled: !!managingQuizId && questionsOpen,
  });

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
      resetForm();
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

  const addQuestionsMutation = useMutation({
    mutationFn: ({ quizId, questions }: { quizId: string; questions: { questionText: string; options?: string[]; correctAnswer?: string | number; type?: string }[] }) =>
      api.addQuizQuestions(quizId, questions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-detail-admin", managingQuizId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes-admin"] });
      toast.success("Questions added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add questions"),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: ({ quizId, questionId }: { quizId: string; questionId: string }) =>
      api.deleteQuestion(quizId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-detail-admin", managingQuizId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes-admin"] });
      toast.success("Question deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete question"),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateQuiz(aiText, parseInt(aiNumQuestions, 10) || 5, "mcq"),
    onSuccess: (data) => {
      setAiGeneratedQuestions(data.questions);
      toast.success(`Generated ${data.questions.length} questions. Review and save them.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormTimeLimit("");
    setFormActive(false);
  };

  const resetManualForm = () => {
    setManualQuestion("");
    setManualOptions(["", "", "", ""]);
    setManualCorrect(0);
  };

  const openEdit = (quiz: { id: string; title: string; description?: string | null; time_limit_minutes?: number | null; is_active: boolean }) => {
    setEditingQuizId(quiz.id);
    setFormTitle(quiz.title);
    setFormDescription(quiz.description ?? "");
    setFormTimeLimit(quiz.time_limit_minutes != null ? String(quiz.time_limit_minutes) : "");
    setFormActive(quiz.is_active);
    setEditOpen(true);
  };

  const openQuestions = (quiz: { id: string; title: string }) => {
    setManagingQuizId(quiz.id);
    setManagingQuizTitle(quiz.title);
    setQuestionsOpen(true);
    setAiGeneratedQuestions([]);
    resetManualForm();
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

  const handleAddManualQuestion = () => {
    if (!managingQuizId || !manualQuestion.trim()) {
      toast.error("Question text is required");
      return;
    }
    const nonEmpty = manualOptions.filter((o) => o.trim());
    if (nonEmpty.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }
    addQuestionsMutation.mutate({
      quizId: managingQuizId,
      questions: [{
        questionText: manualQuestion.trim(),
        options: manualOptions.filter((o) => o.trim()),
        correctAnswer: manualCorrect,
        type: "mcq",
      }],
    });
    resetManualForm();
  };

  const handleSaveAiQuestions = () => {
    if (!managingQuizId || aiGeneratedQuestions.length === 0) return;
    addQuestionsMutation.mutate({
      quizId: managingQuizId,
      questions: aiGeneratedQuestions.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        type: "mcq",
      })),
    });
    setAiGeneratedQuestions([]);
    setAiText("");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Quiz Manager</h1>
          <p className="text-muted-foreground mt-1">Create quizzes and manage questions</p>
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
                <Input id="create-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Quiz title" />
              </div>
              <div>
                <Label htmlFor="create-desc">Description (optional)</Label>
                <Input id="create-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" />
              </div>
              <div>
                <Label htmlFor="create-time">Time limit (minutes, optional)</Label>
                <Input id="create-time" type="number" min={1} value={formTimeLimit} onChange={(e) => setFormTimeLimit(e.target.value)} placeholder="e.g. 15" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Brain className="h-5 w-5" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${quiz.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {quiz.is_active ? "Active" : "Draft"}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{quiz.questions} questions</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openQuestions(quiz)}>
                    <ListChecks className="h-3 w-3" />
                    Questions
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit({ ...quiz, description: quiz.description ?? null, time_limit_minutes: quiz.time_limit_minutes ?? null })}>
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline" size="sm" className="gap-1"
                    onClick={() => updateMutation.mutate({ id: quiz.id, updates: { is_active: !quiz.is_active } })}
                    disabled={updateMutation.isPending}
                  >
                    {quiz.is_active ? <><PowerOff className="h-3 w-3" />Unpublish</> : <><Power className="h-3 w-3" />Publish</>}
                  </Button>
                  <Button
                    variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => { if (window.confirm("Delete this quiz? This cannot be undone.")) deleteMutation.mutate(quiz.id); }}
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit quiz</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Quiz title" />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description (optional)</Label>
              <Input id="edit-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" />
            </div>
            <div>
              <Label htmlFor="edit-time">Time limit (minutes, optional)</Label>
              <Input id="edit-time" type="number" min={1} value={formTimeLimit} onChange={(e) => setFormTimeLimit(e.target.value)} placeholder="e.g. 15" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="edit-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border" />
              <Label htmlFor="edit-active">Published (visible to students)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Questions Management Dialog */}
      <Dialog open={questionsOpen} onOpenChange={(open) => { setQuestionsOpen(open); if (!open) setManagingQuizId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Questions &mdash; {managingQuizTitle}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">Current Questions</TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">Add Manually</TabsTrigger>
              <TabsTrigger value="ai" className="flex-1">AI Generate</TabsTrigger>
            </TabsList>

            {/* Existing Questions Tab */}
            <TabsContent value="existing" className="mt-4 space-y-3">
              {loadingDetail ? (
                <p className="text-muted-foreground text-sm">Loading questions...</p>
              ) : !quizDetail?.questions || quizDetail.questions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No questions yet. Add some manually or generate with AI.</p>
              ) : (
                quizDetail.questions.map((q, i) => (
                  <Card key={q.id} className="shadow-none border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                            {q.question}
                          </p>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {q.options.map((opt, j) => (
                                <p key={j} className={`text-xs px-2 py-1 rounded ${q.correct === j ? "bg-green-50 text-green-700 font-medium" : "text-muted-foreground"}`}>
                                  {String.fromCharCode(65 + j)}. {opt}
                                  {q.correct === j && " (correct)"}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => {
                            if (managingQuizId && window.confirm("Delete this question?")) {
                              deleteQuestionMutation.mutate({ quizId: managingQuizId, questionId: q.id });
                            }
                          }}
                          disabled={deleteQuestionMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Manual Add Tab */}
            <TabsContent value="manual" className="mt-4 space-y-4">
              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={manualQuestion}
                  onChange={(e) => setManualQuestion(e.target.value)}
                  placeholder="Enter the question..."
                  className="mt-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Options (mark the correct one)</Label>
                {manualOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={manualCorrect === i}
                      onChange={() => setManualCorrect(i)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium w-6">{String.fromCharCode(65 + i)}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const updated = [...manualOptions];
                        updated[i] = e.target.value;
                        setManualOptions(updated);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={handleAddManualQuestion}
                disabled={addQuestionsMutation.isPending}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {addQuestionsMutation.isPending ? "Adding..." : "Add Question"}
              </Button>
            </TabsContent>

            {/* AI Generate Tab */}
            <TabsContent value="ai" className="mt-4 space-y-4">
              <div>
                <Label>Paste document text or study material</Label>
                <Textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Paste the content you want to generate questions from..."
                  className="mt-1 min-h-[120px]"
                />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label>Number of questions</Label>
                  <Input
                    type="number" min={1} max={20}
                    value={aiNumQuestions}
                    onChange={(e) => setAiNumQuestions(e.target.value)}
                    className="w-24 mt-1"
                  />
                </div>
                <div className="pt-5">
                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending || !aiText.trim()}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {generateMutation.isPending ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>

              {aiGeneratedQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Preview ({aiGeneratedQuestions.length} questions)</p>
                    <Button onClick={handleSaveAiQuestions} disabled={addQuestionsMutation.isPending} size="sm" className="gap-1">
                      {addQuestionsMutation.isPending ? "Saving..." : "Save All to Quiz"}
                    </Button>
                  </div>
                  {aiGeneratedQuestions.map((q, i) => (
                    <Card key={i} className="shadow-none border">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">
                          <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                          {q.questionText}
                        </p>
                        {q.options?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt, j) => (
                              <p key={j} className="text-xs text-muted-foreground">
                                {String.fromCharCode(65 + j)}. {opt}
                                {q.correctAnswer === String.fromCharCode(65 + j) && " \u2713"}
                              </p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {!isLoading && quizzes.length === 0 && (
        <p className="text-muted-foreground">No quizzes. Create one with the button above.</p>
      )}
    </div>
  );
}
