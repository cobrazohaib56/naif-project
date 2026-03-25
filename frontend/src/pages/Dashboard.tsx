import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Brain,
  Flame,
  Upload,
  Play,
  Clock,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api.getNotes(),
  });
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => api.getQuizzes(),
  });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.getTasks(),
  });

  const notesSummarized = notes.filter((n) => n.summarized).length;
  const today = new Date().toISOString().slice(0, 10);
  const upcomingTasks = tasks
    .filter((t) => t.due_date >= today && !t.is_completed)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);
  const displayName = user?.name || user?.email?.split("@")[0] || "Student";

  const stats = [
    { label: "Notes Summarized", value: String(notesSummarized), icon: FileText, color: "bg-blue-50 text-primary" },
    { label: "Quizzes Available", value: String(quizzes.length), icon: Brain, color: "bg-green-50 text-success" },
    { label: "Study Streak", value: "—", icon: Flame, color: "bg-orange-50 text-warning" },
  ];

  const recentActivity = notes.slice(0, 4).map((n) => ({
    title: n.name,
    desc: n.summarized ? "AI summary available" : "Uploaded",
    time: formatDate(n.date),
    icon: FileText,
    badge: n.summarized ? "Summary" : "Note",
    badgeColor: n.summarized ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700",
    url: `/notes/${n.id}`,
  }));

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Hello, {displayName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your study progress overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notesLoading || quizzesLoading || tasksLoading ? "…" : stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/notes">
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Upload New Note</p>
                  <p className="text-sm text-muted-foreground">Add a document for AI analysis</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/quizzes">
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success group-hover:bg-success group-hover:text-success-foreground transition-colors">
                  <Play className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Start a Quiz</p>
                  <p className="text-sm text-muted-foreground">Test your knowledge with AI quizzes</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {(tasksLoading || upcomingTasks.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Tasks</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {tasksLoading ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Loading tasks…</div>
              ) : (
                upcomingTasks.map((task) => (
                <Link
                  key={task.id}
                  to="/schedule"
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                >
                  <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.due_date}</p>
                  </div>
                </Link>
              ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Notes</h2>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="flex items-center gap-4 p-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 shrink-0" />
                <p className="text-sm">No notes yet. Upload a document to get started.</p>
              </div>
            ) : (
              recentActivity.map((item, i) => (
                <Link
                  key={item.title + i}
                  to={item.url}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${i < recentActivity.length - 1 ? "border-b" : ""}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {item.time}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return "Today";
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default Dashboard;
