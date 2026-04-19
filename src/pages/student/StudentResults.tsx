import { useEffect, useMemo, useState } from "react";
import { BarChart3, Check, Lock, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Attempt, Quiz } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function StudentResults() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [quizzes, setQuizzes] = useState<Record<string, Quiz>>({});

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      const [as, qs] = await Promise.all([api.listAttempts({ studentId: user.id }), api.listQuizzes()]);
      setAttempts(as);
      const map: Record<string, Quiz> = {};
      qs.forEach((q) => (map[q.id] = q));
      setQuizzes(map);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const published = attempts.filter((a) => quizzes[a.quizId]?.isPublished);
    if (published.length === 0) return { count: 0, avg: 0, best: 0 };
    const scores = published.map((a) => a.score);
    return {
      count: published.length,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
    };
  }, [attempts, quizzes]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return <EmptyState icon={BarChart3} title="No attempts yet" description="Once you complete a quiz, your results show up here." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your results</h1>
        <p className="text-sm text-muted-foreground mt-1">Scores appear once your faculty publishes them.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={BarChart3} label="Published attempts" value={stats.count} />
        <StatCard icon={BarChart3} label="Best score" value={`${stats.best}%`} gradient="from-secondary to-primary" />
        <StatCard icon={BarChart3} label="Average" value={`${stats.avg}%`} gradient="from-accent to-primary" />
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {attempts.map((a) => {
          const quiz = quizzes[a.quizId];
          const published = quiz?.isPublished;
          return (
            <AccordionItem key={a.id} value={a.id} className="glass rounded-2xl border px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                  <div className="min-w-0 text-left">
                    <p className="font-medium truncate">{quiz?.title ?? "Quiz"}</p>
                    <p className="text-xs text-muted-foreground">
                      Attempt #{a.attemptNumber} · {format(new Date(a.submittedAt), "MMM d, HH:mm")}
                    </p>
                  </div>
                  {published ? (
                    <Badge className="bg-gradient-primary text-primary-foreground">{a.score}%</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Pending</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {!published || !quiz ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Results will be visible once your faculty publishes them.
                  </p>
                ) : (
                  <div className="space-y-3 pb-2">
                    <p className="text-sm">
                      <span className="font-medium">{a.correctCount}</span>/{a.totalCount} correct
                      {" · "}<span className="text-muted-foreground">Time: {Math.floor(a.timeTakenSec / 60)}m {a.timeTakenSec % 60}s</span>
                    </p>
                    {quiz.questions.map((q, idx) => {
                      const chosen = a.answers[idx];
                      const correct = q.correctIndex;
                      const ok = chosen === correct;
                      return (
                        <Card key={q.id} className="p-3 rounded-xl bg-background/40">
                          <div className="flex items-start gap-2">
                            <span className={cn("mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                              ok ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
                              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{idx + 1}. {q.text}</p>
                              <p className="text-xs mt-1">
                                Your answer:{" "}
                                <span className={ok ? "text-success" : "text-destructive"}>
                                  {chosen >= 0 ? q.options[chosen] : "—"}
                                </span>
                              </p>
                              {!ok && (
                                <p className="text-xs text-muted-foreground">
                                  Correct: <span className="text-success">{q.options[correct]}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
