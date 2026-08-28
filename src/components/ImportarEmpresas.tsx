import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { listarListasFn } from "@/lib/econodata.functions";
import { criarImportacaoFn } from "@/lib/importacoes.functions";
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
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });
  const criarImportacao = useServerFn(criarImportacaoFn);
  const navigate = useNavigate();
  const qc = useQueryClient();

  function limpar() {
    setCnpjs([]);
    setArquivo("");
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

  // Etapa 1: o sistema só recebe os CNPJs (rápido). O enriquecimento roda
  // depois, em blocos, na tela de Importações — com retomada e reprocessamento.
  async function importar() {
    if (cnpjs.length === 0) return;
    setEnviando(true);
    try {
      const r = await criarImportacao({
        data: {
          arquivo,
          cnpjs,
          listId: lista === "nenhuma" ? null : lista,
        },
      });
      qc.invalidateQueries({ queryKey: ["importacoes"] });
      toast.success(`${r.total} CNPJ(s) na fila. Iniciando o processamento…`);
      setAberto(false);
      limpar();
      navigate({ to: "/importacoes" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
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

  const importando = enviando;

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
            Envie um arquivo CSV ou TXT com CNPJs. O sistema recebe a lista na hora e o
            enriquecimento roda depois, em blocos, na tela de Importações.
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

        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={baixarModelo}>
            <Download className="h-4 w-4" />
            Baixar modelo
          </Button>
          <Button onClick={() => void importar()} disabled={importando || cnpjs.length === 0}>
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar para a fila {cnpjs.length > 0 ? `${cnpjs.length} CNPJ(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
