import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      toast({ title: "Welcome back!", description: `Signed in as ${user.name}.` });
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from ?? (user.role === "faculty" ? "/faculty" : "/student"), { replace: true });
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (role: "faculty" | "student") => {
    form.setValue("email", role === "faculty" ? "faculty@demo.com" : "student@demo.com");
    form.setValue("password", "password");
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <header className="container flex items-center justify-between h-16">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="glass w-full max-w-md p-8 rounded-2xl shadow-elevated animate-scale-in">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your QuizVerse account.</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="you@college.edu" autoComplete="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary hover:opacity-90 shadow-glow h-11">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </Form>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("faculty")}>Demo: Faculty</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("student")}>Demo: Student</Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            New to QuizVerse?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
