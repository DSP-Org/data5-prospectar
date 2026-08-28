import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | Prospectar360" },
      { name: "description", content: "Acesse o Prospectar360 para gerenciar prospecção de empresas por unidade." },
      { property: "og:title", content: "Entrar | Prospectar360" },
      { property: "og:description", content: "Acesse o Prospectar360 para gerenciar sua prospecção B2B." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/" });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    void navigate({ to: "/" });
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome },
      },
    });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada. Entrando...");
    const { error: erroLogin } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (erroLogin) {
      toast.message("Confirme seu e-mail para acessar.");
      return;
    }
    void navigate({ to: "/" });
  }

  async function entrarComGoogle() {
    setCarregando(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setCarregando(false);
      toast.error(result.error.message ?? "Não foi possível entrar com o Google.");
      return;
    }
    setCarregando(false);
    const { data } = await supabase.auth.getSession();
    if (data.session) void navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Target className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="font-display text-2xl font-semibold">Prospectar360</h1>
          <p className="text-sm text-muted-foreground">Inteligência e prospecção de empresas</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acesso</CardTitle>
            <CardDescription>Entre com seu e-mail e senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="entrar">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form className="space-y-3 pt-3" onSubmit={entrar}>
                  <div className="space-y-1">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="senha">Senha</Label>
                    <Input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    {carregando ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="criar">
                <form className="space-y-3 pt-3" onSubmit={criarConta}>
                  <div className="space-y-1">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email2">E-mail</Label>
                    <Input id="email2" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="senha2">Senha</Label>
                    <Input id="senha2" type="password" autoComplete="new-password" minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    {carregando ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Novos usuários entram sem unidade vinculada. O master libera o acesso em Usuários.
        </p>
      </div>
    </div>
  );
}
