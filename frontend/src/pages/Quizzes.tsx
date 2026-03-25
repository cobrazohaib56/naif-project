import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Brain, Play } from "lucide-react";
import api from "@/lib/api";

const Quizzes = () => {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => api.getQuizzes(),
  });

  const filtered = quizzes.filter((q) => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subject === "all" || q.description?.toLowerCase().includes(subject.toLowerCase());
    return matchSearch && matchSubject;
  });

  const subjects = ["all", ...new Set(quizzes.map((q) => q.description || "Other").filter(Boolean))];

  const getColor = (i: number) => {
    const colors = ["bg-green-100 text-green-700", "bg-purple-100 text-purple-700", "bg-blue-100 text-primary", "bg-orange-100 text-orange-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700"];
    return colors[i % colors.length];
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Quizzes</h1>
        <p className="text-muted-foreground mt-1">Test your knowledge with AI-generated quizzes</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.filter((s) => s !== "all").map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading quizzes…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((quiz, i) => (
            <Card key={quiz.id} className="shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Brain className="h-5 w-5" />
                  </div>
                  {quiz.description && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getColor(i)}`}>
                      {quiz.description}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{quiz.questions} questions</p>
                <Link to={`/quizzes/${quiz.id}/play`}>
                  <Button className="w-full mt-4 gap-2" size="sm">
                    <Play className="h-4 w-4" />
                    Start Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <p className="text-muted-foreground">No quizzes available.</p>
      )}
    </div>
  );
};

export default Quizzes;
