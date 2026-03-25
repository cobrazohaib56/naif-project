import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, ShieldOff } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.getAdminUsers(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      api.toggleUserStatus(userId, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(isActive ? "User enabled" : "User disabled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update user"),
  });

  const handleToggle = (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "disable" : "enable";
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      toggleMutation.mutate({ userId, isActive: !currentlyActive });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage registered students</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No students yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {users.map((user) => {
                  const isActive = user.is_active !== false;
                  return (
                    <div key={user.id} className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <span className="text-sm font-medium">
                          {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{user.name || "\u2014"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isActive ? "Active" : "Disabled"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : ""}
                      </span>
                      <Button
                        variant={isActive ? "outline" : "default"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleToggle(user.id, isActive)}
                        disabled={toggleMutation.isPending}
                      >
                        {isActive ? (
                          <>
                            <ShieldOff className="h-3.5 w-3.5" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Enable
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
