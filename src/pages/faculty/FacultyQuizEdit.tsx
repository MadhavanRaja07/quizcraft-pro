import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Question, Quiz } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const blankQuestion = (): Question => ({
  id: crypto.randomUUID(),
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

const blankQuiz = (userId: string, name: string): Quiz => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  topic: "",
  difficulty: "medium",
  questions: [blankQuestion()],
  createdBy: userId,
  createdByName: name,
  timeLimit: 15,
  startDate: new Date().toISOString().slice(0, 16),
  endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  attemptLimit: 1,
  isActive: false,
  isPublished: false,
  createdAt: new Date().toISOString(),
});

export default function FacultyQuizEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isNew && user) {
        setQuiz(blankQuiz(user.id, user.name));
        setLoading(false);
        return;
      }
      if (id) {
        const found = await api.getQuiz(id);
        if (!mounted) return;
        if (!found) {
          toast({ title: "Quiz not found", variant: "destructive" });
          navigate("/faculty/quizzes");
          return;
        }
        setQuiz({
          ...found,
          startDate: new Date(found.startDate).toISOString().slice(0, 16),
          endDate: new Date(found.endDate).toISOString().slice(0, 16),
        });
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, isNew, user, navigate]);

  const canSave = useMemo(() => {
    if (!quiz) return false;
    return (
      quiz.title.trim().length >= 3 &&
      quiz.questions.length > 0 &&
      quiz.questions.every((q) => q.text.trim() && q.options.every((o) => o.trim()))
    );
  }, [quiz]);

  const onSave = async () => {
    if (!quiz) return;
    setSaving(true);
    try {
      const toSave: Quiz = {
        ...quiz,
        startDate: new Date(quiz.startDate).toISOString(),
        endDate: new Date(quiz.endDate).toISOString(),
      };
      await api.saveQuiz(toSave);
      toast({ title: "Saved", description: quiz.title });
      navigate("/faculty/quizzes");
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const update = (patch: Partial<Quiz>) => setQuiz((q) => (q ? { ...q, ...patch } : q));
  const updateQ = (qid: string, patch: Partial<Question>) =>
    setQuiz((q) => (q ? { ...q, questions: q.questions.map((x) => (x.id === qid ? { ...x, ...patch } : x)) } : q));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/faculty/quizzes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{isNew ? "New quiz" : "Edit quiz"}</h1>
      </div>

      <Card className="glass rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Title</Label>
            <Input value={quiz.title} onChange={(e) => update({ title: e.target.value })} className="mt-1.5" placeholder="Quiz title" />
          </div>
          <div>
            <Label>Topic</Label>
            <Input value={quiz.topic} onChange={(e) => update({ topic: e.target.value })} className="mt-1.5" placeholder="Subject" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={quiz.description ?? ""} onChange={(e) => update({ description: e.target.value })} className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={quiz.difficulty} onValueChange={(v) => update({ difficulty: v as Quiz["difficulty"] })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Time limit (minutes)</Label>
            <Input type="number" min={1} max={300} value={quiz.timeLimit} onChange={(e) => update({ timeLimit: Number(e.target.value) })} className="mt-1.5" />
          </div>
          <div>
            <Label>Start date</Label>
            <Input type="datetime-local" value={quiz.startDate} onChange={(e) => update({ startDate: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="datetime-local" value={quiz.endDate} onChange={(e) => update({ endDate: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Attempt limit</Label>
            <Input type="number" min={1} max={10} value={quiz.attemptLimit} onChange={(e) => update({ attemptLimit: Number(e.target.value) })} className="mt-1.5" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">Active (visible to students)</span>
            <Switch checked={quiz.isActive} onCheckedChange={(v) => update({ isActive: v })} />
          </label>
          <label className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">Publish results</span>
            <Switch checked={quiz.isPublished} onCheckedChange={(v) => update({ isPublished: v })} />
          </label>
        </div>
      </Card>

      <Card className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Questions ({quiz.questions.length})</h2>
          <Button variant="outline" size="sm" onClick={() => update({ questions: [...quiz.questions, blankQuestion()] })}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>

        {quiz.questions.map((q, idx) => (
          <Card key={q.id} className="p-4 rounded-xl border bg-background/40">
            <div className="flex items-start justify-between gap-3">
              <Label className="text-xs uppercase text-muted-foreground">Question {idx + 1}</Label>
              <Button variant="ghost" size="icon" onClick={() => update({ questions: quiz.questions.filter((x) => x.id !== q.id) })}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea value={q.text} onChange={(e) => updateQ(q.id, { text: e.target.value })} rows={2} className="mt-2" placeholder="Question text" />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted/30 transition-smooth">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctIndex === i}
                    onChange={() => updateQ(q.id, { correctIndex: i })}
                    className="accent-primary"
                  />
                  <Input
                    value={opt}
                    onChange={(e) => updateQ(q.id, { options: q.options.map((o, j) => (j === i ? e.target.value : o)) })}
                    className="border-0 bg-transparent focus-visible:ring-0 px-1 h-8"
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/faculty/quizzes")}>Cancel</Button>
        <Button onClick={onSave} disabled={!canSave || saving} className="bg-gradient-hero hover:opacity-95 shadow-glow">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save quiz
        </Button>
      </div>
    </div>
  );
}
