import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, BookOpen, Trophy, Home, RotateCcw, ListChecks } from "lucide-react";
import api from "@/lib/api";

const QuizResults = () => {
  const location = useLocation();
  const state = location.state as {
    score?: number;
    total?: number;
    title?: string;
    error?: string;
    attemptId?: string;
  } | undefined;
  const score = state?.score ?? 0;
  const total = state?.total ?? 0;
  const title = state?.title ?? "Quiz";
  const attemptId = state?.attemptId;
  const error = state?.error;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const incorrect = total - score;

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<Awaited<ReturnType<typeof api.getAttemptResult>> | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadReview = async () => {
    if (!attemptId) return;
    setReviewLoading(true);
    try {
      const data = await api.getAttemptResult(attemptId);
      setReviewData(data);
    } catch {
      setReviewData(null);
    } finally {
      setReviewLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 text-center">
        <p className="text-destructive">{error}</p>
        <Link to="/quizzes">
          <Button>Back to Quizzes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 text-center">
      <div>
        <div className="flex items-center justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-2">You&apos;ve completed the quiz!</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary bg-primary/5 mb-4">
              <div>
                <p className="text-3xl font-bold text-foreground">{score}/{total}</p>
                <p className="text-sm text-muted-foreground">{percentage}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Performance Summary</h2>
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

      <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
        {attemptId && (
          <Dialog open={reviewOpen} onOpenChange={(open) => { setReviewOpen(open); if (open && !reviewData) loadReview(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <ListChecks className="h-4 w-4" />
                Review answers
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Review answers</DialogTitle>
              </DialogHeader>
              {reviewLoading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : reviewData ? (
                <div className="space-y-4 text-left">
                  {reviewData.questions.map((q, i) => (
                    <Card key={q.questionId} className={q.isCorrect ? "border-green-200" : "border-red-200"}>
                      <CardContent className="p-4">
                        <p className="font-medium text-foreground mb-2">
                          {i + 1}. {q.questionText}
                        </p>
                        <div className="space-y-1 text-sm">
                          {q.options.map((opt) => (
                            <p
                              key={opt.id}
                              className={
                                opt.id === q.correctOptionId
                                  ? "text-green-600 font-medium"
                                  : opt.id === q.userSelectedOptionId && !q.isCorrect
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                              }
                            >
                              {opt.id === q.correctOptionId && "✓ "}
                              {opt.id === q.userSelectedOptionId && !q.isCorrect && "✗ "}
                              {opt.text}
                            </p>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {q.isCorrect ? "Correct" : "Incorrect"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Could not load review.</p>
              )}
            </DialogContent>
          </Dialog>
        )}
        <Link to="/quizzes">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" />
            Back to Quizzes
          </Button>
        </Link>
        <Link to="/">
          <Button className="gap-2 w-full sm:w-auto">
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default QuizResults;
