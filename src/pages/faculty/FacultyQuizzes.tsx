import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Quiz } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";

const PAGE_SIZE = 6;

export default function FacultyQuizzes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const all = await api.listQuizzes();
    setQuizzes(all.filter((q) => q.createdBy === user?.id));
    setLoading(false);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quizzes.filter((q) => !s || q.title.toLowerCase().includes(s) || q.topic.toLowerCase().includes(s));
  }, [quizzes, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleActive = async (q: Quiz) => {
    const updated = { ...q, isActive: !q.isActive };
    await api.saveQuiz(updated);
    setQuizzes((list) => list.map((x) => (x.id === q.id ? updated : x)));
    toast({ title: updated.isActive ? "Quiz activated" : "Quiz disabled" });
  };

  const togglePublished = async (q: Quiz) => {
    const updated = { ...q, isPublished: !q.isPublished };
    await api.saveQuiz(updated);
    setQuizzes((list) => list.map((x) => (x.id === q.id ? updated : x)));
    toast({ title: updated.isPublished ? "Results published" : "Results unpublished" });
  };

  const onDelete = async (q: Quiz) => {
    await api.deleteQuiz(q.id);
    setQuizzes((list) => list.filter((x) => x.id !== q.id));
    toast({ title: "Quiz deleted", description: q.title });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Quizzes</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, configure, and publish quizzes.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search quizzes…"
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Button asChild className="bg-gradient-primary hover:opacity-90 shadow-glow">
            <Link to="/faculty/quizzes/new"><Plus className="mr-1 h-4 w-4" /> New</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No quizzes yet"
          description="Generate one with AI or create from scratch to get started."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to="/faculty/generate">Use AI</Link></Button>
              <Button asChild className="bg-gradient-primary"><Link to="/faculty/quizzes/new">New quiz</Link></Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((q) => (
              <Card key={q.id} className="glass rounded-2xl p-5 transition-smooth hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{q.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {q.topic} · {q.questions.length} Qs · {q.timeLimit}min
                    </p>
                  </div>
                  <Badge variant={q.isActive ? "default" : "secondary"} className={q.isActive ? "bg-success text-success-foreground" : ""}>
                    {q.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Opens {format(new Date(q.startDate), "MMM d")}</span>
                  <span>·</span>
                  <span>Closes {format(new Date(q.endDate), "MMM d, yyyy")}</span>
                  <span>·</span>
                  <span>Max {q.attemptLimit} attempt{q.attemptLimit > 1 ? "s" : ""}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                    Active
                    <Switch checked={q.isActive} onCheckedChange={() => toggleActive(q)} />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                    Results
                    <Switch checked={q.isPublished} onCheckedChange={() => togglePublished(q)} />
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/faculty/quizzes/${q.id}`}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/faculty/results?quizId=${q.id}`}>Results</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this quiz?</AlertDialogTitle>
                        <AlertDialogDescription>This also removes all student attempts. Cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(q)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
