import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Search, Eye, Trash, AlertTriangle, Send, User, Phone, Edit2, Check, X, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VendasList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [isEditingAfiliado, setIsEditingAfiliado] = useState(false);
  const [newAfiliadoId, setNewAfiliadoId] = useState("");
  const [exactMatch, setExactMatch] = useState(false);

  const { data: pedidosData, isLoading: loading, refetch: fetchPedidos } = useQuery({
    queryKey: ['pedidos-list'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // 1. Identificar Role e ID se for Vendedor
      const { data: vData } = await supabase
        .from('vendedores')
        .select('id, is_admin')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      const role = (vData && vData.is_admin === false) ? 'guardiao' : 'admin';

      // 2. Query de Pedidos
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(nome_completo, cpf, telefone, email),
          evento:eventos(titulo),
          vendedor:vendedores(nome),
          convidados(nome_completo)
        `);

      if (role === 'afiliado' && vData) {
        query = query.eq('vendedor_id', vData.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      return {
        pedidos: data || [],
        role,
        vendedorId: vData?.id
      };
    }
  });

  const { data: vendedores } = useQuery({
    queryKey: ['vendedores-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendedores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  const pedidos = pedidosData?.pedidos || [];
  const userRole = pedidosData?.role || 'admin';
  const vendedorId = pedidosData?.vendedorId;

  const handleAprovar = async (pedidoId: string) => {
    if (!confirm("Tem certeza que deseja aprovar esta venda manualmente? Um WhatsApp será enviado ao cliente.")) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/pedidos/aprovar-manual/${pedidoId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error("Erro na requisição");

      toast.success("Venda aprovada e confirmação enviada com sucesso!");
      fetchPedidos();
      setSelectedPedido(null);
    } catch (error) {
      console.error("Erro ao aprovar venda:", error);
      toast.error("Erro ao aprovar venda.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePendente = async (pedidoId: string) => {
    if (!confirm("Tem certeza que deseja mudar o status para Pendente?")) return;
    setActionLoading(true);
    try {
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({ status: 'pendente', pago_em: null })
        .eq('id', pedidoId);
      
      if (pedidoError) throw pedidoError;

      toast.success("Venda alterada para pendente com sucesso!");
      fetchPedidos();
      setSelectedPedido(null);
    } catch (error) {
      console.error("Erro ao alterar venda:", error);
      toast.error("Erro ao alterar para pendente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async (pedidoId: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta venda?")) return;
    setActionLoading(true);
    try {
      // Atualiza status do pedido
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({ status: 'cancelado' })
        .eq('id', pedidoId);
      
      if (pedidoError) throw pedidoError;

      toast.success("Venda cancelada com sucesso!");
      fetchPedidos();
      setSelectedPedido(null);
    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      toast.error("Erro ao cancelar venda.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExcluir = async (pedidoId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', pedidoId);

      if (error) throw error;

      toast.success("Venda excluída permanentemente!");
      fetchPedidos();
      setSelectedPedido(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Erro ao excluir venda:", error);
      toast.error("Erro ao excluir venda.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendComprovante = async (pedidoId: string) => {
    setActionLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/pedidos/reenviar-comprovante/${pedidoId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      toast.success("Comprovante reenviado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao reenviar comprovante:", error);
      toast.error("Erro ao reenviar: " + (error.message || "Erro desconhecido"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAfiliado = async (pedidoId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ vendedor_id: newAfiliadoId || null })
        .eq('id', pedidoId);

      if (error) throw error;

      toast.success("Afiliado atualizado com sucesso!");
      setIsEditingAfiliado(false);
      fetchPedidos();
      
      // Update local state for the modal
      const updatedVendedor = vendedores?.find(v => v.id === newAfiliadoId);
      setSelectedPedido({
        ...selectedPedido,
        vendedor_id: newAfiliadoId,
        vendedor: updatedVendedor ? { nome: updatedVendedor.nome } : null
      });
    } catch (error) {
      console.error("Erro ao atualizar afiliado:", error);
      toast.error("Erro ao atualizar afiliado.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPedidos = pedidos.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    
    if (exactMatch) {
      return p.display_id?.toLowerCase() === term;
    }
    
    const matchName = p.cliente?.nome_completo?.toLowerCase().includes(term);
    const matchGuest = p.convidados?.some((c: any) => c.nome_completo.toLowerCase().includes(term));
    const matchDisplayId = p.display_id?.toLowerCase().includes(term);
    
    return matchName || matchGuest || matchDisplayId;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago': return <Badge className="bg-green-500">Pago</Badge>;
      case 'pendente': return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'expirado': return <Badge className="bg-red-500">Expirado</Badge>;
      case 'cancelado': return <Badge className="bg-gray-500">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Vendas</h1>
          <p className="text-gray-500 dark:text-slate-400">Gerencie as compras e aprovações manuais.</p>
        </div>
        <div className="w-full sm:w-auto bg-gray-50/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/80 flex flex-col gap-3 transition-colors hover:border-blue-100 dark:hover:border-slate-700">
          <div className="relative w-full sm:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <Input
              placeholder={exactMatch ? "Digite o ID exato da venda..." : "Encontrar por Nome, Convidado ou ID..."}
              className="pl-10 pr-10 h-11 bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-700 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-xl transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-start sm:justify-end gap-2 px-1">
            <Switch 
              id="exact-match" 
              checked={exactMatch} 
              onCheckedChange={setExactMatch} 
            />
            <label htmlFor="exact-match" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              Buscar ID específico
            </label>
          </div>
        </div>
      </div>

      <Card className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-slate-950/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
            <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3 min-w-[120px]">Valor</th>
                <th className="px-6 py-3">Status</th>
                {userRole === 'admin' && <th className="px-6 py-3">Vendedor</th>}
                <th className="px-6 py-3">Evento</th>
                <th className="px-6 py-3">ID / Data</th>
                {userRole === 'admin' && <th className="px-6 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((pedido) => (
                  <tr 
                    key={pedido.id} 
                    className="bg-white dark:bg-slate-900/50 border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedPedido(pedido)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-slate-200">{pedido.cliente?.nome_completo || 'Cliente s/ nome'}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{pedido.cliente?.cpf}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-slate-200 whitespace-nowrap">
                      R$ {Number(pedido.valor_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(pedido.status)}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4">
                        {pedido.venda_direta ? (
                          <div className="flex items-center gap-1.5">
                            {pedido.vendedor ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1" title="Atribuído aleatoriamente">
                                <Search className="h-3 w-3 text-purple-500 dark:text-purple-400" /> {pedido.vendedor.nome}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 font-normal bg-gray-50 dark:bg-slate-800 flex items-center gap-1 border-gray-200 dark:border-slate-700">
                                <Search className="h-3 w-3" /> Direto
                              </Badge>
                            )}
                          </div>
                        ) : (
                          pedido.vendedor ? (
                            <div className="text-blue-600 dark:text-blue-400 font-medium">{pedido.vendedor.nome}</div>
                          ) : (
                            <Badge variant="outline" className="text-gray-400 font-normal border-gray-200 dark:border-slate-700">Nenhum</Badge>
                          )
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-slate-200 truncate max-w-[150px]">{pedido.evento?.titulo}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{pedido.quantidade} ingresso(s)</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-gray-900 dark:text-slate-200 font-bold">{pedido.display_id || pedido.id.substring(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{new Date(pedido.created_at).toLocaleDateString('pt-BR')}</div>
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPedido(pedido)}>
                          <Eye className="h-4 w-4 mr-2" /> Detalhes
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedPedido} onOpenChange={(open) => {
        if (!open) {
          setSelectedPedido(null);
          setIsEditingAfiliado(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
            <DialogDescription className="text-center">
              <span className="text-2xl font-black text-gray-900 dark:text-slate-100 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">#{selectedPedido?.display_id}</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-6 py-4">
              <div className="pl-3 py-2 border-l-2 border-purple-400/50 dark:border-purple-500/50 rounded-l-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-450 flex items-center gap-1.5 mb-1">
                      <User className="h-3.5 w-3.5" /> Cliente
                    </p>
                    <p className="font-medium text-gray-900 dark:text-slate-200">{selectedPedido.cliente?.nome_completo}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{selectedPedido.cliente?.cpf}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-450 flex items-center gap-1.5 mb-1">
                      <Phone className="h-3.5 w-3.5" /> Contato
                    </p>
                    <a 
                      href={`https://wa.me/55${selectedPedido.cliente?.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 dark:text-blue-450 hover:underline flex items-center gap-1"
                    >
                      {selectedPedido.cliente?.telefone}
                    </a>
                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{selectedPedido.cliente?.email}</p>
                  </div>
                </div>
              </div>

              <div className="border-t dark:border-slate-800 pt-4">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">Ingressos / Convidados ({selectedPedido.quantidade})</p>
                <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                  {selectedPedido.convidados?.map((c: any, index: number) => (
                    <div 
                      key={c.id} 
                      className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-md flex items-center justify-between shadow-sm border border-slate-200 dark:border-slate-800 text-sm"
                    >
                      <span className="font-bold text-gray-800 dark:text-gray-200">Ingresso #{index + 1}</span>
                      <span className="text-gray-600 dark:text-gray-400">{c.nome_completo}</span>
                    </div>
                  ))}
                  {(!selectedPedido.convidados || selectedPedido.convidados.length === 0) && (
                    <p className="text-sm text-gray-500 italic">Nenhum convidado registrado.</p>
                  )}
                </div>
              </div>

              {userRole === 'admin' && (
                <div className="border-t dark:border-slate-800 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500 dark:text-slate-450">Origem da Venda</p>
                    {!isEditingAfiliado && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`h-8 px-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 ${selectedPedido.status === 'pago' ? 'cursor-pointer' : ''}`}
                          onClick={() => handleResendComprovante(selectedPedido.id, true)}
                          disabled={actionLoading || selectedPedido.status !== 'pago'}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Notificar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          onClick={() => {
                            setNewAfiliadoId(selectedPedido.vendedor_id || "");
                            setIsEditingAfiliado(true);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingAfiliado ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="flex-1 h-9 rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 dark:text-slate-200 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={newAfiliadoId}
                        onChange={(e) => setNewAfiliadoId(e.target.value)}
                      >
                        <option value="">Sem afiliado (Venda Direta)</option>
                        {vendedores?.map((v: any) => (
                          <option key={v.id} value={v.id}>{v.nome}</option>
                        ))}
                      </select>
                      <Button 
                        size="sm" 
                        className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                        onClick={() => handleUpdateAfiliado(selectedPedido.id)}
                        disabled={actionLoading}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                        onClick={() => setIsEditingAfiliado(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {selectedPedido.venda_direta ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50">
                          <Search className="h-3 w-3 mr-1" /> Venda Direta
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50">
                          Link de Indicação
                        </Badge>
                      )}
                      
                      {selectedPedido.vendedor && (
                        <span className="font-medium text-gray-900 dark:text-slate-200">
                          {selectedPedido.vendedor.nome} 
                          {selectedPedido.venda_direta && <span className="text-xs text-gray-500 dark:text-gray-500 font-normal ml-2">(Atribuído Aleatoriamente)</span>}
                        </span>
                      )}
                      {!selectedPedido.vendedor && selectedPedido.venda_direta && (
                        <span className="text-gray-500 dark:text-slate-450 italic text-sm">Nenhum afiliado atribuído</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Status</p>
                  {getStatusBadge(selectedPedido.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-slate-400">Valor Total</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {Number(selectedPedido.valor_total).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs border-t dark:border-slate-800 pt-3 pb-1">
                {selectedPedido.mp_payment_id && (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">ID MP: {selectedPedido.mp_payment_id}</span>
                )}
                {selectedPedido.pix_transaction_id && (
                  <span className="text-green-600 dark:text-green-400 font-semibold truncate max-w-[200px]" title={selectedPedido.pix_transaction_id}>
                    ID Pix: {selectedPedido.pix_transaction_id}
                  </span>
                )}
              </div>

              {userRole === 'admin' && (
                <div className="flex items-center justify-between pt-4 border-t dark:border-slate-800">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setIsDeleteConfirmed(false);
                      setIsDeleteDialogOpen(true);
                    }}
                    disabled={actionLoading}
                    title="Excluir Registro Permanente"
                  >
                    <Trash className="h-5 w-5" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2">
                      <MoreVertical className="h-4 w-4" /> Ações
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      {selectedPedido.status === 'pago' && (
                        <DropdownMenuItem onClick={() => handleResendComprovante(selectedPedido.id)} disabled={actionLoading}>
                          <Send className="h-4 w-4 mr-2 text-blue-500" /> Re-enviar comprovante
                        </DropdownMenuItem>
                      )}
                      {selectedPedido.status !== 'cancelado' && (
                        <DropdownMenuItem onClick={() => handleCancelar(selectedPedido.id)} disabled={actionLoading}>
                          <XCircle className="h-4 w-4 mr-2 text-red-500" /> Cancelar pedido
                        </DropdownMenuItem>
                      )}
                      {selectedPedido.status !== 'pendente' && (
                        <DropdownMenuItem onClick={() => handlePendente(selectedPedido.id)} disabled={actionLoading}>
                          <Clock className="h-4 w-4 mr-2 text-yellow-500" /> Tornar Pendente
                        </DropdownMenuItem>
                      )}
                      {selectedPedido.status !== 'pago' && (
                        <DropdownMenuItem onClick={() => handleAprovar(selectedPedido.id)} disabled={actionLoading}>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Aprovar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão (Dupla Confirmação) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-center">
              Esta ação excluirá permanentemente o pedido <strong>{selectedPedido?.id.substring(0, 8)}</strong> e todos os registros associados.
            </DialogDescription>
          </DialogHeader>
                    <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-md border border-gray-150 dark:border-slate-800 text-sm">
                <input 
                  type="checkbox" 
                  id="confirm-delete" 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  checked={isDeleteConfirmed}
                  onChange={(e) => setIsDeleteConfirmed(e.target.checked)}
                />
                <label htmlFor="confirm-delete" className="font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                  Eu entendo que esta ação é irreversível.
                </label>
              </div>
            </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1" 
              disabled={!isDeleteConfirmed || actionLoading}
              onClick={() => selectedPedido && handleExcluir(selectedPedido.id)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
