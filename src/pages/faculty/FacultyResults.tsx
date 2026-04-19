import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { BarChart3, Download, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Attempt, Quiz } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function FacultyResults() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const selectedId = params.get("quizId") ?? "";

  useEffect(() => {
    (async () => {
      setLoading(true);
      const all = await api.listQuizzes();
      const mine = all.filter((q) => q.createdBy === user?.id);
      setQuizzes(mine);
      if (!selectedId && mine[0]) setParams({ quizId: mine[0].id }, { replace: true });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setAttempts(await api.listAttempts({ quizId: selectedId }));
    })();
  }, [selectedId]);

  const selected = quizzes.find((q) => q.id === selectedId);

  const stats = useMemo(() => {
    if (attempts.length === 0) return { avg: 0, max: 0, count: 0 };
    const scores = attempts.map((a) => a.score);
    return {
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      max: Math.max(...scores),
      count: attempts.length,
    };
  }, [attempts]);

  const togglePublished = async () => {
    if (!selected) return;
    const updated = { ...selected, isPublished: !selected.isPublished };
    await api.saveQuiz(updated);
    setQuizzes((list) => list.map((q) => (q.id === updated.id ? updated : q)));
    toast({ title: updated.isPublished ? "Results published to students" : "Results hidden from students" });
  };

  const exportExcel = () => {
    if (!selected) return;
    const rows = attempts.map((a) => ({
      Name: a.studentName,
      Score: `${a.score}%`,
      Correct: `${a.correctCount}/${a.totalCount}`,
      Attempt: a.attemptNumber,
      "Time taken": formatDuration(a.timeTakenSec),
      "Submitted at": format(new Date(a.submittedAt), "yyyy-MM-dd HH:mm"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 24 }, { wch: 8 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, `${selected.title.replace(/[^a-z0-9]+/gi, "_")}_results.xlsx`);
    toast({ title: "Exported", description: "Excel file downloaded." });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (quizzes.length === 0) {
    return (
      <EmptyState icon={BarChart3} title="No quizzes yet" description="Create a quiz to start collecting results." />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Results &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Review student attempts and export to Excel.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedId} onValueChange={(v) => setParams({ quizId: v })}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select a quiz" /></SelectTrigger>
            <SelectContent>
              {quizzes.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={exportExcel} disabled={attempts.length === 0} variant="outline">
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {selected && (
        <>
          <Card className="glass rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Publish results to students</p>
              <p className="text-xs text-muted-foreground">Students only see scores when this is on.</p>
            </div>
            <Switch checked={selected.isPublished} onCheckedChange={togglePublished} />
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={BarChart3} label="Total attempts" value={stats.count} gradient="from-primary to-primary-glow" />
            <StatCard icon={Trophy} label="Highest score" value={`${stats.max}%`} gradient="from-secondary to-primary" />
            <StatCard icon={BarChart3} label="Average score" value={`${stats.avg}%`} gradient="from-accent to-primary" />
          </div>

          <Card className="glass rounded-2xl">
            {attempts.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">No attempts yet for this quiz.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Attempt #</TableHead>
                    <TableHead>Time taken</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.studentName}</TableCell>
                      <TableCell>
                        <span className="font-semibold gradient-text">{a.score}%</span>
                      </TableCell>
                      <TableCell>{a.correctCount}/{a.totalCount}</TableCell>
                      <TableCell>{a.attemptNumber}</TableCell>
                      <TableCell>{formatDuration(a.timeTakenSec)}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(a.submittedAt), "MMM d, HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
