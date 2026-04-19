import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Attempt, Quiz } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";

export default function StudentQuizzes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [qs, as] = await Promise.all([
        api.listQuizzes(),
        api.listAttempts({ studentId: user?.id }),
      ]);
      setQuizzes(qs);
      setAttempts(as);
      setLoading(false);
    })();
  }, [user?.id]);

  const now = Date.now();
  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quizzes.filter((q) => {
      if (!q.isActive) return false;
      const start = +new Date(q.startDate);
      const end = +new Date(q.endDate);
      if (now < start || now > end) return false;
      if (difficulty !== "all" && q.difficulty !== difficulty) return false;
      if (s && !(q.title.toLowerCase().includes(s) || q.topic.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [quizzes, search, difficulty, now]);

  const attemptsByQuiz = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attempts) map.set(a.quizId, (map.get(a.quizId) ?? 0) + 1);
    return map;
  }, [attempts]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Available quizzes</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick one and start your attempt.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-full sm:w-56" />
          </div>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={BookOpen} title="No quizzes available" description="Check back later or adjust your filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((q) => {
            const used = attemptsByQuiz.get(q.id) ?? 0;
            const remaining = Math.max(0, q.attemptLimit - used);
            const exhausted = remaining === 0;
            return (
              <Card key={q.id} className="glass rounded-2xl p-5 flex flex-col transition-smooth hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{q.title}</h3>
                  <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">By {q.createdByName} · {q.topic}</p>
                {q.description && <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{q.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimit} min</span>
                  <span>{q.questions.length} questions</span>
                  <span>Closes {format(new Date(q.endDate), "MMM d")}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {used}/{q.attemptLimit} attempt{q.attemptLimit > 1 ? "s" : ""} used
                  </span>
                  <Button asChild disabled={exhausted} size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow">
                    <Link to={exhausted ? "#" : `/student/quizzes/${q.id}`}>
                      {exhausted ? "Limit reached" : used > 0 ? "Retake" : "Start"}
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
