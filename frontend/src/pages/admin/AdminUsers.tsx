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
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, ShieldCheck, ShieldOff, Mail } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.getAdminUsers(),
  });

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const toggleMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      api.toggleUserStatus(userId, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(isActive ? "User enabled" : "User disabled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update user"),
  });

  const emailMutation = useMutation({
    mutationFn: () => api.sendAdminEmail(emailTo, emailSubject, emailBody),
    onSuccess: () => {
      toast.success("Email sent successfully");
      setEmailOpen(false);
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send email"),
  });

  const handleToggle = (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "disable" : "enable";
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      toggleMutation.mutate({ userId, isActive: !currentlyActive });
    }
  };

  const openEmailDialog = (email: string) => {
    setEmailTo(email);
    setEmailSubject("");
    setEmailBody("");
    setEmailOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage registered users</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users yet.</p>
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
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEmailDialog(user.email)}
                        title="Send email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
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

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-to">To</Label>
              <Input id="email-to" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" />
            </div>
            <div>
              <Label htmlFor="email-body">Message</Label>
              <Textarea id="email-body" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Type your message..." className="min-h-[120px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending || !emailSubject.trim() || !emailBody.trim()}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              {emailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
