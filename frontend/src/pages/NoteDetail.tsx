import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Download, FileText, Send, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const NoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string; pageRef?: string }[]>([]);
  const queryClient = useQueryClient();

  const { data: note, isLoading, error } = useQuery({
    queryKey: ["note", id],
    queryFn: () => api.getNote(id!),
    enabled: !!id,
  });

  const summarizeMutation = useMutation({
    mutationFn: () => api.summarize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", id] });
      toast.success("Summary generated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Summarization failed"),
  });

  const handleAskDocument = async () => {
    if (!chatInput.trim() || !id) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: question }]);
    try {
      const res = await api.notesChat(id, question);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          content: res.answer,
          pageRef: res.pageReferences?.[0]?.documentTitle,
        },
      ]);
    } catch (e) {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", content: (e as Error).message },
      ]);
    }
  };

  if (!id) return null;
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !note) return <p className="text-destructive">Document not found.</p>;

  const summaryPoints = note.summary
    ? note.summary.summary_text.split(/\n+/).filter(Boolean)
    : [];
  const keyConcepts = Array.isArray(note.summary?.key_concepts)
    ? note.summary.key_concepts
    : typeof note.summary?.key_concepts === "object"
      ? Object.values(note.summary.key_concepts)
      : [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Link to="/notes">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{note.file_name}</h1>
          <p className="text-sm text-muted-foreground">
            Uploaded {formatDate(note.upload_date)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="bg-muted rounded-t-lg p-3 flex items-center justify-between border-b">
              <span className="text-sm font-medium text-muted-foreground">Document</span>
              {note.download_url && (
                <a href={note.download_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
            <div className="flex items-center justify-center h-[400px] lg:h-[550px] bg-muted/30">
              {note.download_url ? (
                <iframe
                  src={note.download_url}
                  title={note.file_name}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Preview or download via button above</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Insights</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                <TabsTrigger value="concepts" className="flex-1">Key Concepts</TabsTrigger>
                <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4 space-y-3">
                {!note.summary ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Generate a summary from this document.</p>
                    <Button
                      onClick={() => summarizeMutation.mutate()}
                      disabled={summarizeMutation.isPending}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {summarizeMutation.isPending ? "Generating…" : "Generate Summary"}
                    </Button>
                  </div>
                ) : (
                  summaryPoints.map((point, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{point}</p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="concepts" className="mt-4 space-y-3">
                {keyConcepts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Generate a summary first to see key concepts.</p>
                ) : (
                  keyConcepts.map((concept, i) => (
                    <Card key={i} className="shadow-none border">
                      <CardContent className="p-3">
                        <p className="text-sm font-semibold text-foreground">
                          {typeof concept === "string" ? concept : String(concept)}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <div className="flex flex-col h-[350px]">
                  <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                    {chatHistory.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Ask questions about this document…
                      </div>
                    ) : (
                      chatHistory.map((msg, i) => (
                        <div
                          key={i}
                          className={`text-sm p-3 rounded-lg ${msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.pageRef && <p className="text-xs text-muted-foreground mt-1">— {msg.pageRef}</p>}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask about this document..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAskDocument()}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={handleAskDocument}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default NoteDetail;
