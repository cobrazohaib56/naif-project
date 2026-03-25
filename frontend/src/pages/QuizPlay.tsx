import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight } from "lucide-react";
import api from "@/lib/api";

const QuizPlay = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; selectedOptionId: string | null }[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => api.getQuiz(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (finalAnswers: { questionId: string; selectedOptionId: string | null }[]) =>
      api.submitQuiz(id!, finalAnswers.map((a) => ({ questionId: a.questionId, selectedOptionId: a.selectedOptionId }))),
    onSuccess: (data) => {
      navigate(`/quizzes/${id}/results`, { state: { score: data.score, total: data.total, attemptId: data.attemptId, title: quiz?.title } });
    },
    onError: (e) => {
      navigate(`/quizzes/${id}/results`, { state: { error: (e as Error).message } });
    },
  });

  useEffect(() => {
    if (!quiz?.time_limit_minutes) return;
    setTimeLeft(quiz.time_limit_minutes * 60);
  }, [quiz?.time_limit_minutes]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((prev) => (prev != null ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && questions.length > 0) {
      const final = questions.map((qu) => {
        const a = answers.find((x) => x.questionId === qu.id);
        return { questionId: qu.id, selectedOptionId: a?.selectedOptionId ?? null };
      });
      submitMutation.mutate(final);
    }
  }, [timeLeft]);

  const questions = quiz?.questions ?? [];
  const total = questions.length;
  const q = questions[current];

  const handleNext = () => {
    if (q && selected !== null) {
      const optionId = q.optionIds?.[selected] ?? null;
      setAnswers((prev) => {
        const next = prev.filter((a) => a.questionId !== q.id);
        next.push({ questionId: q.id, selectedOptionId: optionId });
        return next;
      });
    }
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      const finalAnswers = questions.map((qu) => {
        if (qu.id === q.id && selected !== null) {
          return { questionId: qu.id, selectedOptionId: q.optionIds?.[selected] ?? null };
        }
        const a = answers.find((x) => x.questionId === qu.id);
        return { questionId: qu.id, selectedOptionId: a?.selectedOptionId ?? null };
      });
      submitMutation.mutate(finalAnswers);
    }
  };

  if (!id) return null;
  if (isLoading) return <p className="text-muted-foreground">Loading quiz…</p>;
  if (error || !quiz) return <p className="text-destructive">Quiz not found.</p>;
  if (total === 0) return <p className="text-muted-foreground">No questions in this quiz.</p>;

  const progress = ((current + 1) / total) * 100;
  const mins = timeLeft != null ? Math.floor(timeLeft / 60) : null;
  const secs = timeLeft != null ? timeLeft % 60 : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{quiz.title}</p>
          <p className="text-lg font-semibold text-foreground">
            Question {current + 1} of {total}
          </p>
        </div>
        {mins != null && (
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 shadow-sm border">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono font-semibold text-foreground">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      <Progress value={progress} className="h-2" />

      <Card className="shadow-sm">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-6">
            {q.question}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options?.map((option: string, i: number) => (
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
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={selected === null || submitMutation.isPending}
          className="gap-2 px-6"
        >
          {current < questions.length - 1 ? "Next Question" : "Finish Quiz"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default QuizPlay;
