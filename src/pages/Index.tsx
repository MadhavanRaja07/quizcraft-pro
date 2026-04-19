import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Brain, Clock, Shield, Sparkles, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const features = [
  { icon: Brain, title: "AI Quiz Generation", desc: "Generate MCQs from any topic in seconds with AI assistance." },
  { icon: Clock, title: "Timed Attempts", desc: "Countdown timer, auto-submit, and auto-saved progress." },
  { icon: BarChart3, title: "Analytics & Excel", desc: "Average, highest score, and one-click .xlsx export." },
  { icon: Trophy, title: "Leaderboards", desc: "Drive engagement with per-quiz student rankings." },
  { icon: Shield, title: "Role-based Access", desc: "Separate dashboards for faculty and students." },
  { icon: Users, title: "Built for Campus", desc: "Designed for college classrooms and faculties." },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === "faculty" ? "/faculty" : "/student", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen mesh-bg">
      <header className="sticky top-0 z-30 glass border-b">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-gradient-primary hover:opacity-90 shadow-glow">
              <Link to="/signup">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="container py-16 sm:py-24 lg:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm font-medium animate-fade-in">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI-powered quiz platform for colleges</span>
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in">
          Quizzes, reimagined for{" "}
          <span className="gradient-text">faculty &amp; students</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in">
          Generate, deliver, and analyze quizzes with a beautiful, modern dashboard.
          Built for the way classrooms actually work.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
          <Button size="lg" asChild className="bg-gradient-hero hover:opacity-95 shadow-glow text-base h-12 px-8">
            <Link to="/signup">
              Create your account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="glass h-12 px-8 text-base">
            <Link to="/login">Try the demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Demo accounts: <code className="px-1.5 py-0.5 rounded bg-muted">faculty@demo.com</code> /{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted">student@demo.com</code> · password{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted">password</code>
        </p>
      </section>

      <section className="container pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className="glass p-6 rounded-2xl border transition-smooth hover:-translate-y-1 hover:shadow-elevated animate-scale-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow mb-4">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t glass">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <Logo />
          <p>© {new Date().getFullYear()} QuizVerse. Built for campuses.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
