import { useEffect, useMemo, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Attempt, Quiz } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export default function StudentLeaderboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [quizId, setQuizId] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const all = await api.listQuizzes();
      const published = all.filter((q) => q.isPublished);
      setQuizzes(published);
      if (published[0]) setQuizId(published[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!quizId) return;
    (async () => setAttempts(await api.listAttempts({ quizId })))();
  }, [quizId]);

  const ranking = useMemo(() => {
    const byStudent = new Map<string, { name: string; best: number }>();
    for (const a of attempts) {
      const cur = byStudent.get(a.studentId);
      if (!cur || a.score > cur.best) byStudent.set(a.studentId, { name: a.studentName, best: a.score });
    }
    return Array.from(byStudent.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.best - a.best);
  }, [attempts]);

  if (loading) {
    return <div className="max-w-3xl mx-auto space-y-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-72" /></div>;
  }
  if (quizzes.length === 0) {
    return <EmptyState icon={Trophy} title="No leaderboards yet" description="Leaderboards appear once faculty publishes results." />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Top scorers per quiz.</p>
        </div>
        <Select value={quizId} onValueChange={setQuizId}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {quizzes.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="glass rounded-2xl p-2">
        {ranking.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No attempts yet.</p>
        ) : (
          <ul className="divide-y">
            {ranking.map((r, i) => {
              const isMe = r.id === user?.id;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li key={r.id} className={cn("flex items-center justify-between p-3 sm:p-4 rounded-xl", isMe && "bg-gradient-primary/10")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full font-bold",
                      i === 0 ? "bg-gradient-hero text-white shadow-glow" : "bg-muted")}>
                      {medal ?? i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.name} {isMe && <Badge variant="outline" className="ml-1">You</Badge>}</p>
                      {i === 0 && <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Crown className="h-3 w-3" /> Top scorer</p>}
                    </div>
                  </div>
                  <span className="font-bold gradient-text text-lg">{r.best}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
