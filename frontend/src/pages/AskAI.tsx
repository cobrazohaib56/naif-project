import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, User, FileText, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Message {
  role: "user" | "ai";
  content: string;
  source?: { name: string; page?: string };
}

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
    : undefined;

const AskAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  const askMutation = useMutation({
    mutationFn: (question: string) => api.askRag(question),
    onSuccess: (data, question) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        {
          role: "ai",
          content: data.answer,
          source: data.sources?.[0]
            ? { name: data.sources[0].documentTitle, page: data.sources[0].pageNumber != null ? `Page ${data.sources[0].pageNumber}` : undefined }
            : undefined,
        },
      ]);
    },
    onError: (err, question) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "ai", content: err instanceof Error ? err.message : "Something went wrong." },
      ]);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput("");
    askMutation.mutate(q);
  };

  const toggleVoice = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error !== "aborted") {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const voiceSupported = !!SpeechRecognition;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ask AI</h1>
        <p className="text-muted-foreground mt-1">Ask about UNITEN policies and academic info</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Ask a question about UNITEN rules, procedures, or courses. Answers are based on documents uploaded by admins.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 mr-3 mt-1 shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="max-w-[80%]">
              {msg.role === "ai" && (
                <p className="text-xs font-medium text-muted-foreground mb-1">AI Assistant</p>
              )}
              <Card className={`shadow-sm ${msg.role === "user" ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                <CardContent className="p-4">
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${msg.role === "user" ? "text-primary-foreground" : "text-foreground"}`}>
                    {msg.content}
                  </p>
                </CardContent>
              </Card>
              {msg.source && (
                <Card className="mt-2 shadow-none border border-dashed">
                  <CardContent className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{msg.source.name}</p>
                      {msg.source.page && <p className="text-xs text-muted-foreground">{msg.source.page}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary ml-3 mt-1 shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t pt-4">
        <Input
          placeholder={isListening ? "Listening..." : "Ask a question about UNITEN..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1"
          disabled={askMutation.isPending}
        />
        {voiceSupported && (
          <Button
            onClick={toggleVoice}
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            disabled={askMutation.isPending}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Button onClick={handleSend} size="icon" disabled={askMutation.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AskAI;
