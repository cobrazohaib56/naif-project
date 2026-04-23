import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, Brain, FolderOpen } from "lucide-react";
import api from "@/lib/api";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.getAdminAnalytics(),
  });

  const stats = [
    { label: "Total Users", value: data?.totalStudents ?? 0, icon: Users, color: "bg-blue-50 text-primary" },
    { label: "Documents Uploaded", value: data?.totalDocuments ?? 0, icon: FileText, color: "bg-green-50 text-success" },
    { label: "Active Quizzes", value: data?.activeQuizzes ?? 0, icon: Brain, color: "bg-amber-50 text-amber-600" },
    { label: "RAG Documents Indexed", value: data?.ragDocumentsIndexed ?? 0, icon: FolderOpen, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform overview</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
