import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

type GeneratedQuestion = {
  questionText: string;
  options: string[];
  correctAnswer: string;
  type: string;
  order_index: number;
};

type Stage = "setup" | "playing" | "done";

function letterFromIndex(i: number): string {
  return String.fromCharCode(65 + i);
}

function correctIndexFor(q: GeneratedQuestion): number {
  const raw = (q.correctAnswer ?? "").trim();
  if (/^[A-D]$/i.test(raw)) {
    return raw.toUpperCase().charCodeAt(0) - 65;
  }
  const asNum = Number(raw);
  if (Number.isInteger(asNum) && asNum >= 0 && asNum < q.options.length) {
    return asNum;
  }
  const matchIdx = q.options.findIndex(
    (opt) => opt.trim().toLowerCase() === raw.toLowerCase()
  );
  return matchIdx >= 0 ? matchIdx : 0;
}

export default function SmartQuiz() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("setup");

  const [ragDocId, setRagDocId] = useState("");
  const [numQuestions, setNumQuestions] = useState("5");

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState("Smart Quiz");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const { data: ragDocuments = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["rag-documents"],
    queryFn: () => api.getAdminRagDocuments(),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      api.generateQuiz({
        ragDocumentId: ragDocId,
        numQuestions: Math.max(1, Math.min(20, parseInt(numQuestions, 10) || 5)),
        questionType: "mcq",
      }),
    onSuccess: (data) => {
      const qs = (data.questions ?? []).filter(
        (q) => q.options && q.options.length >= 2
      );
      if (qs.length === 0) {
        toast.error("The AI couldn't build valid questions from that document. Try a different one.");
        return;
      }
      const doc = ragDocuments.find((d) => d.id === ragDocId);
      setQuizTitle(doc ? `Quiz · ${doc.title}` : "Smart Quiz");
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setSelected(null);
      setCurrent(0);
      setStage("playing");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const handleStart = () => {
    if (!ragDocId) {
      toast.error("Pick a document first");
      return;
    }
    generateMutation.mutate();
  };

  const handleNext = () => {
    if (selected == null) return;
    const nextAnswers = [...answers];
    nextAnswers[current] = selected;
    setAnswers(nextAnswers);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(nextAnswers[current + 1] ?? null);
    } else {
      setStage("done");
    }
  };

  const handleReset = () => {
    setStage("setup");
    setQuestions([]);
    setAnswers([]);
    setSelected(null);
    setCurrent(0);
  };

  if (stage === "setup") {
    const selectedDoc = ragDocuments.find((d) => d.id === ragDocId);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/quizzes")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Button>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Smart Quiz</h1>
              <p className="text-muted-foreground text-sm">
                Generate a fresh AI quiz from any document in your knowledge base.
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label>Document</Label>
              <Select value={ragDocId} onValueChange={setRagDocId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDocs ? "Loading..." : "Choose a document..."} />
                </SelectTrigger>
                <SelectContent>
                  {ragDocuments.map((doc) => (
                    <SelectItem
                      key={doc.id}
                      value={doc.id}
                      disabled={doc.chunksCount === 0}
                    >
                      {doc.title} ({doc.chunksCount} chunks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingDocs && ragDocuments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No documents yet.{" "}
                  <Link to="/admin/documents" className="text-primary underline">
                    Upload one
                  </Link>{" "}
                  to get started.
                </p>
              )}
              {selectedDoc && selectedDoc.chunksCount === 0 && (
                <p className="text-xs text-destructive">
                  This document has 0 indexed chunks and can't be used. Try another one.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="num-q">Number of questions</Label>
              <Input
                id="num-q"
                type="number"
                min={1}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Between 1 and 20.</p>
            </div>

            <Button
              onClick={handleStart}
              disabled={
                !ragDocId ||
                generateMutation.isPending ||
                (selectedDoc?.chunksCount ?? 0) === 0
              }
              className="gap-2 w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {generateMutation.isPending ? "Generating..." : "Generate & Start"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "playing") {
    const q = questions[current];
    const total = questions.length;
    const progress = ((current + 1) / total) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{quizTitle}</p>
            <p className="text-lg font-semibold text-foreground">
              Question {current + 1} of {total}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Cancel
          </Button>
        </div>

        <Progress value={progress} className="h-2" />

        <Card className="shadow-sm">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-6">
              {q.questionText}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`p-4 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                    selected === i
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold mr-3">
                    {letterFromIndex(i)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleNext} disabled={selected == null} className="gap-2 px-6">
            {current < total - 1 ? "Next Question" : "Finish Quiz"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const score = questions.reduce((acc, q, i) => {
    const ans = answers[i];
    if (ans == null) return acc;
    return acc + (ans === correctIndexFor(q) ? 1 : 0);
  }, 0);
  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const incorrect = total - score;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{quizTitle}</h1>
        <p className="text-muted-foreground mt-2">You&apos;ve completed the quiz!</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary bg-primary/5 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">
                  {score}/{total}
                </p>
                <p className="text-sm text-muted-foreground">{percentage}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 text-center">
          Performance Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center p-5">
              <CheckCircle className="h-8 w-8 text-success mb-2" />
              <p className="text-2xl font-bold text-foreground">{score}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center p-5">
              <XCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-2xl font-bold text-foreground">{incorrect}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center p-5">
              <BookOpen className="h-8 w-8 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Review</h2>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const correctIdx = correctIndexFor(q);
            const userIdx = answers[i];
            const isCorrect = userIdx === correctIdx;
            return (
              <Card key={i} className={isCorrect ? "border-green-200" : "border-red-200"}>
                <CardContent className="p-4">
                  <p className="font-medium text-foreground mb-2">
                    <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                    {q.questionText}
                  </p>
                  <div className="space-y-1 text-sm">
                    {q.options.map((opt, j) => (
                      <p
                        key={j}
                        className={
                          j === correctIdx
                            ? "text-green-600 font-medium"
                            : j === userIdx && !isCorrect
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }
                      >
                        {j === correctIdx && "✓ "}
                        {j === userIdx && !isCorrect && "✗ "}
                        {letterFromIndex(j)}. {opt}
                      </p>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isCorrect ? "Correct" : userIdx == null ? "Skipped" : "Incorrect"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Generate Another
        </Button>
        <Link to="/quizzes">
          <Button className="gap-2 w-full sm:w-auto">Back to Quizzes</Button>
        </Link>
      </div>
    </div>
  );
}
