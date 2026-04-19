import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
});
const passwordSchema = z
  .object({
    current: z.string().min(1, "Required"),
    next: z.string().min(6, "Min 6 characters").max(100),
    confirm: z.string().min(6).max(100),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export default function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [savingP, setSavingP] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });
  const pwd = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  if (!user) return null;
  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const onSaveProfile = async (values: z.infer<typeof profileSchema>) => {
    setSavingP(true);
    try {
      const updated = await api.updateProfile(user.id, { name: values.name, email: values.email });
      refresh(updated);
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSavingP(false);
    }
  };

  const onChangePassword = async (values: z.infer<typeof passwordSchema>) => {
    setSavingPw(true);
    try {
      await api.changePassword(user.id, values.current, values.next);
      pwd.reset();
      toast({ title: "Password changed" });
    } catch (err) {
      toast({ title: "Change failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account.</p>
      </div>

      <Card className="glass rounded-2xl p-6 flex items-center gap-4">
        <Avatar className="h-16 w-16 ring-2 ring-primary/40">
          <AvatarFallback className="bg-gradient-hero text-white text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold truncate">{user.name}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <Badge className="mt-1 capitalize bg-gradient-primary text-primary-foreground">{user.role}</Badge>
        </div>
      </Card>

      <Card className="glass rounded-2xl p-6">
        <h2 className="font-semibold">Account details</h2>
        <Form {...profile}>
          <form onSubmit={profile.handleSubmit(onSaveProfile)} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={profile.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={profile.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingP} className="bg-gradient-primary hover:opacity-90 shadow-glow">
                {savingP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      <Card className="glass rounded-2xl p-6">
        <h2 className="font-semibold">Change password</h2>
        <Form {...pwd}>
          <form onSubmit={pwd.handleSubmit(onChangePassword)} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField control={pwd.control} name="current" render={({ field }) => (
              <FormItem><FormLabel>Current</FormLabel><FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={pwd.control} name="next" render={({ field }) => (
              <FormItem><FormLabel>New</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={pwd.control} name="confirm" render={({ field }) => (
              <FormItem><FormLabel>Confirm</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="sm:col-span-3">
              <Button type="submit" disabled={savingPw} variant="outline">
                {savingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      <Card className="glass rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="font-semibold">Sign out</p>
          <p className="text-sm text-muted-foreground">End your session on this device.</p>
        </div>
        <Button variant="outline" onClick={() => { logout(); navigate("/login"); }} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </Card>
    </div>
  );
}
