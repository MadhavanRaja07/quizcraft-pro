import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Question, Quiz } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  topic: z.string().trim().min(2, "Topic is required").max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  count: z.coerce.number().int().min(1).max(20),
});

export default function FacultyGenerate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { topic: "", difficulty: "medium", count: 5 },
  });

  const topic = form.watch("topic");
  const difficulty = form.watch("difficulty");

  const onGenerate = async (values: z.infer<typeof schema>) => {
    setGenerating(true);
    try {
      const qs = await api.generateQuestions(values);
      setQuestions(qs);
      if (!title) setTitle(`${values.topic} — ${values.difficulty}`);
      toast({ title: "Generated!", description: `${qs.length} questions ready to edit.` });
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };
  const updateOption = (id: string, idx: number, value: string) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q)));
  };

  const canSave = useMemo(
    () => title.trim().length >= 3 && questions.length > 0 && questions.every((q) => q.text.trim() && q.options.every((o) => o.trim())),
    [title, questions],
  );

  const onSaveDraft = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const quiz: Quiz = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim() || undefined,
        topic: topic || "General",
        difficulty,
        questions,
        createdBy: user.id,
        createdByName: user.name,
        timeLimit: 15,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        attemptLimit: 1,
        isActive: false,
        isPublished: false,
        createdAt: new Date().toISOString(),
      };
      await api.saveQuiz(quiz);
      toast({ title: "Saved as draft", description: "Edit settings on the Quizzes tab." });
      navigate(`/faculty/quizzes/${quiz.id}`);
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Quiz Generation</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a topic and difficulty — we’ll draft MCQs you can edit before saving.</p>
      </div>

      <Card className="glass rounded-2xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onGenerate)} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <FormField control={form.control} name="topic" render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Topic</FormLabel>
                <FormControl><Input placeholder="e.g. Operating Systems" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="difficulty" render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="count" render={({ field }) => (
              <FormItem>
                <FormLabel># Questions</FormLabel>
                <FormControl><Input type="number" min={1} max={20} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="sm:col-span-4">
              <Button type="submit" disabled={generating} className="bg-gradient-primary hover:opacity-90 shadow-glow">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {generating ? "Generating…" : "Generate with AI"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      {questions.length > 0 && (
        <Card className="glass rounded-2xl p-6 space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Quiz title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a name" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary" className="mt-1.5" />
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={q.id} className="p-4 rounded-xl border border-border/60 bg-background/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <Label className="text-xs uppercase text-muted-foreground">Question {idx + 1}</Label>
                      <Textarea
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                        rows={2}
                        className="mt-1.5"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 rounded-lg border border-border/60 p-2 hover:bg-muted/30 transition-smooth">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctIndex === i}
                            onChange={() => updateQuestion(q.id, { correctIndex: i })}
                            className="accent-primary"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(q.id, i, e.target.value)}
                            className="border-0 bg-transparent focus-visible:ring-0 px-1 h-8"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setQuestions((qs) => [
                  ...qs,
                  {
                    id: crypto.randomUUID(),
                    text: "",
                    options: ["", "", "", ""],
                    correctIndex: 0,
                  },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add question
            </Button>
            <Button onClick={onSaveDraft} disabled={!canSave || saving} className="bg-gradient-hero hover:opacity-95 shadow-glow">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save as draft
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
