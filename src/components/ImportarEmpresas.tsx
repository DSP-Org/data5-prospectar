import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { consultarCnpjsFn, listarListasFn } from "@/lib/econodata.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function extrairCnpjs(texto: string) {
  const achados = texto.match(/\d[\d./-]{12,19}/g) ?? [];
  const limpos = achados
    .map((v) => v.replace(/\D/g, ""))
    .filter((v) => v.length === 14);
  return Array.from(new Set(limpos));
}

export function ImportarEmpresas() {
  const [aberto, setAberto] = useState(false);
  const [cnpjs, setCnpjs] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState("");
  const [lista, setLista] = useState("nenhuma");
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });
  const consultar = useServerFn(consultarCnpjsFn);
  const qc = useQueryClient();

  function limpar() {
    setCnpjs([]);
    setArquivo("");
    setProgresso(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function aoSelecionar(file: File | undefined) {
    if (!file) return;
    const texto = await file.text();
    const encontrados = extrairCnpjs(texto);
    setArquivo(file.name);
    setCnpjs(encontrados);
    if (encontrados.length === 0)
      toast.error("Nenhum CNPJ válido encontrado no arquivo.");
  }

  async function importar() {
    if (cnpjs.length === 0) return;
    const lotes: string[][] = [];
    for (let i = 0; i < cnpjs.length; i += 100) lotes.push(cnpjs.slice(i, i + 100));
    setProgresso({ feito: 0, total: cnpjs.length });
    let encontradas = 0;
    let falhas = 0;
    try {
      for (const lote of lotes) {
        const r = await consultar({
          data: {
            cnpjs: lote,
            listId: lista === "nenhuma" ? null : lista,
            salvar: true,
          },
        });
        for (const item of r.itens) {
          if (item.encontrada) encontradas += 1;
          else falhas += 1;
        }
        setProgresso((p) => (p ? { ...p, feito: p.feito + lote.length } : p));
      }
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["listas"] });
      qc.invalidateQueries({ queryKey: ["sem-lista"] });
      qc.invalidateQueries({ queryKey: ["painel"] });
      toast.success(`${encontradas} empresa(s) importada(s). ${falhas} sem retorno.`);
      setAberto(false);
      limpar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgresso(null);
    }
  }

  function baixarModelo() {
    const conteudo = [
      "CNPJ",
      "00000000000191",
      "00.360.305/0001-04",
      "33.000.167/0001-01",
    ].join("\n");
    const blob = new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-importacao-cnpjs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const importando = progresso !== null;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (importando) return;
        setAberto(v);
        if (!v) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar empresas</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV ou TXT com CNPJs. Cada CNPJ encontrado é consultado na
            Econodata e salvo na base.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arquivo-cnpjs">Arquivo (.csv ou .txt)</Label>
            <input
              id="arquivo-cnpjs"
              ref={inputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              disabled={importando}
              onChange={(e) => void aoSelecionar(e.target.files?.[0])}
              className="block w-full cursor-pointer rounded-md border border-input bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
            />
            {arquivo ? (
              <p className="text-sm text-muted-foreground">
                {arquivo}: {cnpjs.length} CNPJ(s) válido(s) encontrado(s).
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Vincular à lista</Label>
            <Select value={lista} onValueChange={setLista} disabled={importando}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma lista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma lista</SelectItem>
                {(listas.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {progresso ? (
            <p className="text-sm text-muted-foreground">
              Consultando {progresso.feito} de {progresso.total}…
            </p>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={baixarModelo}>
            <Download className="h-4 w-4" />
            Baixar modelo
          </Button>
          <Button onClick={() => void importar()} disabled={importando || cnpjs.length === 0}>
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importar {cnpjs.length > 0 ? `${cnpjs.length} CNPJ(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
