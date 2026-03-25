import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Check, X, Sparkles } from "lucide-react";
import api from "@/lib/api";

interface Suggestion {
  type: "grammar" | "clarity" | "style";
  highlight: string;
  explanation: string;
}

const typeConfig = {
  grammar: { label: "Grammar", color: "bg-red-100 text-red-700 border-red-200" },
  clarity: { label: "Clarity", color: "bg-amber-100 text-amber-700 border-amber-200" },
  style: { label: "Style", color: "bg-pink-100 text-pink-700 border-pink-200" },
};

const WritingCoach = () => {
  const [text, setText] = useState(
    "Their going to the library due to the fact that they need to study for a very important exam. They have alot of material to review in order to pass."
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [improvedText, setImprovedText] = useState<string | null>(null);

  const improveMutation = useMutation({
    mutationFn: (originalText: string) => api.improveWriting(originalText),
    onSuccess: (data) => {
      setSuggestions(
        data.suggestions.map((s) => ({
          type: s.type,
          highlight: s.highlight ?? s.original,
          explanation: s.explanation,
        }))
      );
      setImprovedText(data.improvedText);
    },
    onError: () => setSuggestions([]),
  });

  const handleAnalyze = () => {
    improveMutation.mutate(text);
  };

  const handleAccept = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Writing Coach</h1>
        <p className="text-muted-foreground mt-1">Get AI-powered feedback to enhance your writing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="h-4 w-4 text-primary" />
                Your Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type your text here..."
                className="min-h-[300px] lg:min-h-[400px] resize-none"
              />
            </CardContent>
          </Card>
          <Button
            onClick={handleAnalyze}
            className="w-full gap-2"
            disabled={improveMutation.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {improveMutation.isPending ? "Analyzing…" : "Analyze Text"}
          </Button>
          {improvedText && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Improved version</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-foreground">{improvedText}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Suggestions
              {suggestions.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {suggestions.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Check className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Analyze your text to see suggestions</p>
              </div>
            ) : (
              suggestions.map((sug, i) => {
                const config = typeConfig[sug.type];
                return (
                  <Card key={i} className="shadow-none border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${config.color}`}>
                            {config.label}
                          </span>
                          <p className="text-sm mt-2">
                            <span className="font-medium text-foreground">&quot;{sug.highlight}&quot;</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{sug.explanation}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:bg-green-50"
                            onClick={() => handleAccept(i)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                            onClick={() => handleAccept(i)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WritingCoach;
