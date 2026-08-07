import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  ScanLine,
  CheckCircle2,
  Search,
  Undo2,
  ArrowDownAZ,
  Hash,
  XCircle,
  AlertTriangle,
  CalendarDays,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { QrScanner } from "@/components/QrScanner";

interface Participante {
  id: string;
  nome_completo: string;
  numero?: number | null;
  confirmado?: boolean;
  checkin_em?: string | null;
  pedidoId?: string;
  displayId?: string;
  comprador?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  quantidade?: number;
  valorTotal?: number;
  pedidoData?: string;
  vendedorNome?: string;
  status?: string;
}

type ScanStatus = 'ok' | 'already' | 'notfound' | 'notpaid' | 'otherevent' | 'invalid' | null;

export default function CheckinList() {
  const queryClient = useQueryClient();
  const [selectedEvento, setSelectedEvento] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<'az' | 'numero'>('az');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null);
  const [scanned, setScanned] = useState<Participante | null>(null);
  const [scanError, setScanError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [view, setView] = useState<'todos' | 'feitos'>('todos');
  const [selectedParticipante, setSelectedParticipante] = useState<Participante | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: eventos = [] } = useQuery({
    queryKey: ['checkin-eventos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos')
        .select('id, titulo, data_evento, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Pré-seleciona o último evento criado
  useEffect(() => {
    if (!selectedEvento && eventos.length > 0) {
      setSelectedEvento(eventos[0].id);
    }
  }, [eventos, selectedEvento]);

  const { data: participantes = [], isLoading } = useQuery({
    queryKey: ['checkin', selectedEvento],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convidados')
        .select(
          'id, nome_completo, numero, confirmado, checkin_em, pedido:pedidos!inner(id, display_id, status, quantidade, valor_total, created_at, vendedor:vendedores(nome), cliente:clientes(nome_completo, email, telefone))'
        )
        .eq('pedidos.evento_id', selectedEvento)
        .eq('pedidos.status', 'pago')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id,
        nome_completo: c.nome_completo,
        numero: c.numero,
        confirmado: c.confirmado,
        checkin_em: c.checkin_em,
        pedidoId: c.pedido?.id,
        displayId: c.pedido?.display_id,
        status: c.pedido?.status,
        comprador: c.pedido?.cliente?.nome_completo,
        clienteEmail: c.pedido?.cliente?.email,
        clienteTelefone: c.pedido?.cliente?.telefone,
        quantidade: c.pedido?.quantidade,
        valorTotal: c.pedido?.valor_total,
        pedidoData: c.pedido?.created_at,
        vendedorNome: c.pedido?.vendedor?.nome,
      }));
    },
    enabled: !!selectedEvento,
  });

  const eventoSelecionado = eventos.find((e: any) => e.id === selectedEvento);

  const sorted = useMemo(() => {
    const arr = [...participantes];
    if (sortMode === 'az') {
      arr.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'));
    } else {
      arr.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
    }
    return arr;
  }, [participantes, sortMode]);

  const filtered = useMemo(() => {
    const byView =
      view === 'feitos'
        ? sorted.filter((p) => p.checkin_em)
        : sorted.filter((p) => !p.checkin_em);
    const term = search.trim().toLowerCase();
    if (!term) return byView;
    return byView.filter(
      (p) =>
        p.nome_completo.toLowerCase().includes(term) ||
        String(p.numero ?? '').includes(term) ||
        (p.displayId || '').toLowerCase().includes(term) ||
        (p.comprador || '').toLowerCase().includes(term)
    );
  }, [sorted, search, view]);

  const total = participantes.length;
  const feitos = participantes.filter((p) => p.checkin_em).length;
  const pendentes = total - feitos;

  const doCheckin = async (convidadoId: string) => {
    const { error } = await supabase
      .from('convidados')
      .update({ checkin_em: new Date().toISOString() })
      .eq('id', convidadoId);
    if (error) throw error;
  };

  const undoCheckin = async (convidadoId: string) => {
    const { error } = await supabase
      .from('convidados')
      .update({ checkin_em: null })
      .eq('id', convidadoId);
    if (error) throw error;
  };

  const handleManualCheckin = async (p: Participante) => {
    setBusyId(p.id);
    try {
      await doCheckin(p.id);
      toast.success(`Check-in de ${p.nome_completo} confirmado!`);
      queryClient.invalidateQueries({ queryKey: ['checkin', selectedEvento] });
    } catch (e: any) {
      toast.error("Erro ao fazer check-in: " + (e.message || "erro desconhecido"));
    } finally {
      setBusyId(null);
    }
  };

  const handleUndoCheckin = async (p: Participante) => {
    setBusyId(p.id);
    try {
      await undoCheckin(p.id);
      toast.success(`Check-in de ${p.nome_completo} desfeito.`);
      queryClient.invalidateQueries({ queryKey: ['checkin', selectedEvento] });
    } catch (e: any) {
      toast.error("Erro ao desfazer check-in: " + (e.message || "erro desconhecido"));
    } finally {
      setBusyId(null);
    }
  };

  const handleScanResult = async (text: string) => {
    try {
      const found = participantes.find((p) => p.id === text);
      if (found) {
        setScanned(found);
        setScanStatus(found.checkin_em ? 'already' : 'ok');
        return;
      }

      const { data } = await supabase
        .from('convidados')
        .select(
          'id, nome_completo, numero, confirmado, checkin_em, pedido:pedidos!inner(id, display_id, status, evento:eventos(titulo), cliente:clientes(nome_completo))'
        )
        .eq('id', text)
        .maybeSingle();

      if (!data) {
        setScanned(null);
        setScanStatus('notfound');
        return;
      }
      const pedido: any = Array.isArray(data.pedido) ? data.pedido[0] : data.pedido;
      if (pedido?.status !== 'pago') {
        setScanned(null);
        setScanStatus('notpaid');
        return;
      }
      setScanned(null);
      setScanStatus('otherevent');
      setScanError(pedido?.evento?.titulo || "outro evento");
    } catch (e) {
      console.error("Erro ao processar QR:", e);
      setScanned(null);
      setScanStatus('invalid');
    }
  };

  const handleScanError = (msg: string) => {
    toast.error(msg);
  };

  const handleScanResultRef = useRef(handleScanResult);
  handleScanResultRef.current = handleScanResult;

  const confirmScanned = async () => {
    if (!scanned) return;
    if (scanned.checkin_em) {
      setScanStatus('already');
      return;
    }
    setCheckingIn(true);
    try {
      await doCheckin(scanned.id);
      toast.success(`Check-in de ${scanned.nome_completo} confirmado!`);
      queryClient.invalidateQueries({ queryKey: ['checkin', selectedEvento] });
      setScanned(null);
      setScannerOpen(false);
    } catch (e: any) {
      toast.error("Erro ao fazer check-in: " + (e.message || "erro desconhecido"));
    } finally {
      setCheckingIn(false);
    }
  };

  const closeScanner = () => {
    setScannerOpen(false);
    setScanned(null);
    setScanStatus(null);
    setScanError("");
  };

  const formatHora = (iso?: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatData = (d?: string) => {
    if (!d) return "";
    const [datePart] = d.split("T");
    if (!datePart) return "";
    const [y, m, day] = datePart.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center md:justify-start gap-2">
            <ScanLine className="text-blue-500" /> Check-in de Participantes
          </h1>
          <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm mt-1">
            Escaneie o QR code do ingresso ou faça check-in manualmente.
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4">
          <Select value={selectedEvento} onValueChange={setSelectedEvento}>
            <SelectTrigger className="w-full md:w-72 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700">
              <SelectValue>
                {eventos.find((e: any) => e.id === selectedEvento)?.titulo || "Selecione o evento..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950">
              {eventos.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setScannerOpen(true)}
            disabled={!selectedEvento}
            className="hidden md:inline-flex w-full md:w-auto h-11 px-5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 rounded-xl"
          >
            <ScanLine className="h-4 w-4 mr-2" /> Escanear QR Code
          </Button>
        </div>
      </div>

      {selectedEvento && eventoSelecionado && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">{eventoSelecionado.titulo}</span>
          <span>• {formatData(eventoSelecionado.data_evento)}</span>
        </div>
      )}

      {total > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card
            onClick={() => setView('feitos')}
            className={`cursor-pointer transition-all border-green-100 dark:border-slate-800 bg-white dark:bg-slate-900 ${
              view === 'feitos' ? 'ring-2 ring-green-500/60 shadow-md' : 'hover:border-green-300 dark:hover:border-green-800'
            }`}
          >
            <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-950/40">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-green-600 dark:text-green-400">{feitos}</p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Check-ins feitos</p>
              </div>
            </CardContent>
          </Card>
          <Card
            onClick={() => setView('todos')}
            className={`cursor-pointer transition-all border-amber-100 dark:border-slate-800 bg-white dark:bg-slate-900 ${
              view === 'todos' ? 'ring-2 ring-amber-500/60 shadow-md' : 'hover:border-amber-300 dark:hover:border-amber-800'
            }`}
          >
            <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{pendentes}</p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className={`relative w-full sm:flex sm:flex-1 ${searchOpen ? 'flex' : 'hidden'}`}>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            autoFocus={searchOpen}
            placeholder="Buscar por nome, n° do ingresso ou ID do pedido..."
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-start">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Ordenar por:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSortMode('az')}
              className={`px-4 py-2.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 ${
                sortMode === 'az' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownAZ className="h-3.5 w-3.5" /> A–Z
            </button>
            <button
              onClick={() => setSortMode('numero')}
              className={`px-4 py-2.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 ${
                sortMode === 'numero' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Hash className="h-3.5 w-3.5" /> N°
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            className="sm:hidden inline-flex items-center justify-center h-11 px-3 gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 text-xs font-bold"
            title="Buscar"
            aria-label="Buscar"
          >
            {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>
      </div>

      {!selectedEvento ? (
        <Card className="border border-slate-100 dark:border-slate-800 bg-card shadow-sm">
          <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
            Selecione um evento para ver os participantes confirmados.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border border-slate-100 dark:border-slate-800 bg-card shadow-sm">
          <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
            {search
              ? "Nenhum participante encontrado para a busca."
              : view === 'feitos'
              ? "Nenhum check-in feito ainda."
              : "Todos os participantes já fizeram check-in."}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-100 dark:border-slate-800 bg-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {view === 'feitos'
                  ? `${filtered.length} ${filtered.length === 1 ? 'check-in feito' : 'check-ins feitos'}`
                  : `${filtered.length} ${filtered.length === 1 ? 'participante pendente' : 'participantes pendentes'}`}
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p, index) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedParticipante(p)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  title="Ver dados da compra"
                >
                  <Badge variant="outline" className="shrink-0 font-mono text-sm px-2.5 py-1 font-black bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                    {sortMode === 'numero' && p.numero ? `#${String(p.numero).padStart(2, '0')}` : `#${index + 1}`}
                  </Badge>
                  <p className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-snug whitespace-normal">
                    {p.nome_completo}
                  </p>
                  {p.checkin_em && (
                    <span className="ml-auto shrink-0">
                      <Badge className="bg-green-500 text-white gap-1 text-xs px-2.5 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {formatHora(p.checkin_em)}
                      </Badge>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAB de escanear (mobile) */}
      <button
        onClick={() => setScannerOpen(true)}
        disabled={!selectedEvento}
        className="md:hidden fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        title="Escanear QR Code"
        aria-label="Escanear QR Code"
      >
        <ScanLine className="h-6 w-6" />
      </button>

      <Dialog open={scannerOpen} onOpenChange={(open) => !open && closeScanner()}>
        <DialogContent className="sm:max-w-[420px] dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>
              Aponte a câmera para o QR code do comprovante do participante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!scanned && !scanStatus && (
              <QrScanner onResult={(t) => handleScanResultRef.current(t)} onError={handleScanError} />
            )}

            {scanned && scanStatus === 'ok' && (
              <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="font-bold text-green-700 dark:text-green-300">Participante encontrado</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                  <p className="font-black text-lg text-slate-900 dark:text-slate-100">{scanned.nome_completo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {scanned.numero ? `Ingresso #${String(scanned.numero).padStart(2, '0')}` : "Ingresso sem número"} 
                    {scanned.displayId ? ` • Pedido #${scanned.displayId}` : ""}
                  </p>
                  {scanned.comprador && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Comprador: {scanned.comprador}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={confirmScanned} disabled={checkingIn}>
                    {checkingIn ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Confirmar check-in
                  </Button>
                  <Button variant="outline" onClick={closeScanner}>Fechar</Button>
                </div>
              </div>
            )}

            {scanned && scanStatus === 'already' && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <p className="font-bold text-amber-700 dark:text-amber-300">Check-in já realizado</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                  <p className="font-black text-lg text-slate-900 dark:text-slate-100">{scanned.nome_completo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fez check-in às <span className="font-bold">{formatHora(scanned.checkin_em)}</span>
                  </p>
                </div>
                <Button className="w-full" variant="outline" onClick={closeScanner}>Fechar</Button>
              </div>
            )}

            {scanStatus === 'notfound' && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="font-bold text-red-700 dark:text-red-300">QR Code não reconhecido</p>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Nenhum participante encontrado para este QR code. Verifique se o comprovante é válido.
                </p>
                <Button className="w-full" variant="outline" onClick={closeScanner}>Fechar</Button>
              </div>
            )}

            {scanStatus === 'notpaid' && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="font-bold text-red-700 dark:text-red-300">Ingresso não pago</p>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  O pedido deste participante não está com status pago.
                </p>
                <Button className="w-full" variant="outline" onClick={closeScanner}>Fechar</Button>
              </div>
            )}

            {scanStatus === 'otherevent' && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="font-bold text-red-700 dark:text-red-300">Ingresso de outro evento</p>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Este ingresso pertence ao evento <span className="font-bold">{scanError}</span>.
                </p>
                <Button className="w-full" variant="outline" onClick={closeScanner}>Fechar</Button>
              </div>
            )}

            {scanStatus === 'invalid' && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="font-bold text-red-700 dark:text-red-300">QR Code inválido</p>
                </div>
                <Button className="w-full" variant="outline" onClick={closeScanner}>Fechar</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedParticipante} onOpenChange={(open) => !open && setSelectedParticipante(null)}>
        <DialogContent className="sm:max-w-[460px] dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-blue-500" /> Dados da Compra
            </DialogTitle>
            <DialogDescription>
              Informações do participante e do pedido.
            </DialogDescription>
          </DialogHeader>

          {selectedParticipante && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <p className="font-black text-lg text-slate-900 dark:text-slate-100 leading-snug">{selectedParticipante.nome_completo}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-base">
                  <Badge variant="outline" className="font-mono px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 font-black">
                    {selectedParticipante.numero ? `Ingresso #${String(selectedParticipante.numero).padStart(2, '0')}` : "Ingresso s/ número"}
                  </Badge>
                  {selectedParticipante.displayId && (
                    <Badge variant="outline" className="font-mono px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 font-black">
                      Pedido #{selectedParticipante.displayId}
                    </Badge>
                  )}
                  {selectedParticipante.checkin_em && (
                    <Badge className="bg-green-500 text-white gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Check-in {formatHora(selectedParticipante.checkin_em)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Quantidade</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{selectedParticipante.quantidade ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Valor total</p>
                  <p className="text-lg font-black text-green-600 dark:text-green-400">
                    R$ {selectedParticipante.valorTotal != null ? Number(selectedParticipante.valorTotal).toFixed(2) : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Data da compra</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatData(selectedParticipante.pedidoData)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Status</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    {(selectedParticipante.status || "").charAt(0).toUpperCase() + (selectedParticipante.status || "").slice(1)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Comprador</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">{selectedParticipante.comprador || "—"}</p>
                {selectedParticipante.clienteTelefone && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedParticipante.clienteTelefone}</p>
                )}
                {selectedParticipante.clienteEmail && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedParticipante.clienteEmail}</p>
                )}
                {selectedParticipante.vendedorNome && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Vendido por: <span className="font-semibold">{selectedParticipante.vendedorNome}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={() => {
                    const isUndo = !!selectedParticipante.checkin_em;
                    setSelectedParticipante(null);
                    if (isUndo) {
                      handleUndoCheckin(selectedParticipante);
                      setView('todos');
                    } else {
                      handleManualCheckin(selectedParticipante);
                      setView('feitos');
                    }
                  }}
                  disabled={busyId === selectedParticipante.id}
                >
                  {busyId === selectedParticipante.id ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-1.5" />
                  ) : selectedParticipante.checkin_em ? (
                    <Undo2 className="h-5 w-5 mr-1.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 mr-1.5" />
                  )}
                  {selectedParticipante.checkin_em ? "Desfazer check-in" : "Confirmar check-in"}
                </Button>
                <Button variant="outline" className="h-12 px-5 text-base" onClick={() => setSelectedParticipante(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
