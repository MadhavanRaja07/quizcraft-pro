import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Clock, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Quiz } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function StudentAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  const storageKey = useMemo(() => (user && id ? `qv:attempt:${user.id}:${id}` : null), [user, id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id || !user) return;
      const q = await api.getQuiz(id);
      if (!mounted) return;
      if (!q) {
        toast({ title: "Quiz not found", variant: "destructive" });
        navigate("/student/quizzes");
        return;
      }

      const used = (await api.listAttempts({ quizId: q.id, studentId: user.id })).length;
      if (used >= q.attemptLimit) {
        toast({ title: "Attempt limit reached", variant: "destructive" });
        navigate("/student/quizzes");
        return;
      }

      // restore auto-saved progress
      let restored: { answers: number[]; startedAt: number } | null = null;
      if (storageKey) {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          try {
            restored = JSON.parse(raw);
          } catch {/* ignore */}
        }
      }
      const initialAnswers = restored?.answers && restored.answers.length === q.questions.length
        ? restored.answers
        : new Array(q.questions.length).fill(-1);
      startedAtRef.current = restored?.startedAt ?? Date.now();
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const total = q.timeLimit * 60;
      setQuiz(q);
      setAnswers(initialAnswers);
      setSecondsLeft(Math.max(0, total - elapsed));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id, user, navigate, storageKey]);

  // persist answers
  useEffect(() => {
    if (!storageKey || !quiz) return;
    localStorage.setItem(storageKey, JSON.stringify({ answers, startedAt: startedAtRef.current }));
  }, [answers, quiz, storageKey]);

  const submit = useCallback(async (auto = false) => {
    if (!quiz || !user || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const timeTakenSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const attempt = await api.submitAttempt({
        studentId: user.id,
        studentName: user.name,
        quizId: quiz.id,
        answers,
        timeTakenSec,
      });
      if (storageKey) localStorage.removeItem(storageKey);
      toast({
        title: auto ? "Time's up — auto-submitted" : "Submitted!",
        description: quiz.isPublished ? `Score: ${attempt.score}%` : "Results will be visible once your faculty publishes them.",
      });
      navigate("/student/results");
    } catch (err) {
      submittedRef.current = false;
      toast({ title: "Submit failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [quiz, user, answers, storageKey, navigate]);

  // countdown
  useEffect(() => {
    if (!quiz) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          void submit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [quiz, submit]);

  if (loading || !quiz) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const answered = answers.filter((a) => a !== -1).length;
  const totalSec = quiz.timeLimit * 60;
  const timeProgress = (secondsLeft / totalSec) * 100;
  const lowTime = secondsLeft <= 30;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 glass border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{quiz.title}</h1>
            <p className="text-xs text-muted-foreground">{answered}/{quiz.questions.length} answered</p>
          </div>
          <div className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-sm font-semibold",
            lowTime ? "bg-destructive/15 text-destructive animate-pulse" : "bg-primary/10 text-primary")}>
            <Clock className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </div>
        </div>
        <Progress value={timeProgress} className="mt-2 h-1" />
      </div>

      {quiz.questions.map((q, idx) => (
        <Card key={q.id} className="glass rounded-2xl p-5 animate-fade-in">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Question {idx + 1} of {quiz.questions.length}</p>
          <h2 className="mt-1 font-medium text-lg">{q.text}</h2>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {q.options.map((opt, i) => {
              const selected = answers[idx] === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAnswers((a) => a.map((v, j) => (j === idx ? i : v)))}
                  className={cn(
                    "text-left rounded-xl border p-3 transition-smooth",
                    selected
                      ? "border-primary bg-gradient-primary/10 shadow-glow"
                      : "hover:border-primary/40 hover:bg-muted/40",
                  )}
                >
                  <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full mr-3 text-xs font-bold",
                    selected ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </Card>
      ))}

      <Card className="glass rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="font-medium">Done? Submit your attempt</p>
          <p className="text-xs text-muted-foreground">Unanswered questions are marked wrong.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={submitting} className="bg-gradient-hero hover:opacity-95 shadow-glow">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Submit attempt?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You answered {answered}/{quiz.questions.length}. You can't change answers after submitting.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction onClick={() => submit(false)}>Submit now</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
