import { useEffect, useRef, useCallback } from "react";

interface Task {
  id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  priority: string;
}

export function useTaskNotifications(tasks: Task[]) {
  const notifiedIds = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const checkAndNotify = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const today = new Date().toISOString().slice(0, 10);

    for (const task of tasks) {
      if (task.is_completed) continue;
      if (notifiedIds.current.has(task.id)) continue;

      // Notify for tasks due today
      if (task.due_date === today) {
        new Notification("Task Due Today", {
          body: `"${task.title}" is due today (${task.priority} priority)`,
          icon: "/favicon.ico",
          tag: `task-${task.id}`,
        });
        notifiedIds.current.add(task.id);
      }

      // Notify for overdue tasks
      if (task.due_date < today) {
        new Notification("Overdue Task", {
          body: `"${task.title}" was due on ${task.due_date}`,
          icon: "/favicon.ico",
          tag: `task-overdue-${task.id}`,
        });
        notifiedIds.current.add(task.id);
      }
    }
  }, [tasks]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    // Check immediately when tasks change
    checkAndNotify();

    // Poll every 60 seconds
    const interval = setInterval(checkAndNotify, 60_000);
    return () => clearInterval(interval);
  }, [checkAndNotify]);

  return {
    supported: "Notification" in window,
    permission: "Notification" in window ? Notification.permission : "denied",
    requestPermission,
  };
}
