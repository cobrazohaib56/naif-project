import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, CheckCircle, Circle, Trash2, Bell, BellOff } from "lucide-react";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-blue-100 text-primary",
  low: "bg-green-100 text-green-700",
};

const Schedule = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.getTasks(),
  });

  const { supported: notifSupported, permission, requestPermission } = useTaskNotifications(tasks);

  const createMutation = useMutation({
    mutationFn: () => api.createTask({ title, due_date: dueDate || new Date().toISOString().slice(0, 10), priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTitle("");
      setDueDate("");
      setPriority("medium");
      setOpen(false);
      toast.success("Task added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add task"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, is_completed }: { id: string; is_completed: boolean }) =>
      api.updateTask(id, { is_completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.due_date === today);
  const upcomingTasks = tasks
    .filter((t) => t.due_date >= today && !t.is_completed)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 10);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground mt-1">Manage your academic tasks and deadlines</p>
        </div>
        <div className="flex items-center gap-2">
          {notifSupported && (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={async () => {
                const granted = await requestPermission();
                toast(granted ? "Notifications enabled" : "Notification permission denied");
              }}
              title={permission === "granted" ? "Notifications enabled" : "Enable notifications"}
            >
              {permission === "granted" ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Submit report"
                  required
                />
              </div>
              <div>
                <Label htmlFor="task-date">Due date</Label>
                <Input
                  id="task-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding…" : "Add Task"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s Tasks</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : todayTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks due today.</p>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <Card key={task.id} className="shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <button
                      type="button"
                      onClick={() => updateMutation.mutate({ id: task.id, is_completed: !task.is_completed })}
                      className="shrink-0"
                    >
                      {task.is_completed ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          task.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        priorityColors[task.priority] ?? "bg-muted"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (window.confirm("Delete this task?")) deleteMutation.mutate(task.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {upcomingTasks.length === 0 ? (
                <div className="p-4 text-muted-foreground text-sm">No upcoming tasks.</div>
              ) : (
                upcomingTasks.map((task, i) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-4 ${i < upcomingTasks.length - 1 ? "border-b" : ""}`}
                  >
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(task.due_date)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (window.confirm("Delete this task?")) deleteMutation.mutate(task.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso === today.toISOString().slice(0, 10)) return "Today";
    if (iso === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default Schedule;
