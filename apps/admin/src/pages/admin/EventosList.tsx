import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash, Eye, Loader2, Link as LinkIcon, CheckCircle2, Calendar, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function EventosList() {
  const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: eventosData, isLoading: loading, refetch: refetchEventos } = useQuery({
    queryKey: ['eventos-list'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // 1. Identificar Role
      const { data: vData } = await supabase
        .from('vendedores')
        .select('*, is_admin')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      const role = (vData && vData.is_admin === false) ? 'afiliado' : 'admin';

      // 2. Query de Eventos
      let eventosQuery = supabase
        .from('eventos')
        .select(`
          *,
          pedidos(status, valor_total, quantidade)
        `);

      if (role === 'afiliado') {
        // Se for afiliado, ocultar rascunhos (desativados)
        eventosQuery = eventosQuery.eq('status', 'ativo');
      }

      const { data, error } = await eventosQuery.order('created_at', { ascending: false });
      if (error) throw error;

      // Calcular progresso real para cada evento
      const eventosComProgresso = (data || []).map(evento => {
        const pedidosPagos = evento.pedidos?.filter((p: any) => p.status === 'pago') || [];
        const vendidos = pedidosPagos.reduce((acc: number, p: any) => acc + Number(p.quantidade || 0), 0);
        const brutoTotal = pedidosPagos.reduce((acc: number, p: any) => acc + Number(p.valor_total || 0), 0);
        
        const progresso = evento.capacidade > 0 ? (vendidos / evento.capacidade) * 100 : 0;
        const liquido = brutoTotal * 0.9901; // Desconto de 0.99% da plataforma de PIX
        
        return { 
          ...evento, 
          ingressosVendidos: vendidos, 
          progresso, 
          faturamentoLiquido: liquido 
        };
      });

      return {
        eventos: eventosComProgresso,
        role,
        vendedor: vData
      };
    }
  });

  const eventos = eventosData?.eventos || [];
  const userRole = eventosData?.role || 'admin';
  const vendedorData = eventosData?.vendedor;
  const vRef = vendedorData?.codigo_ref;

  const confirmDelete = async () => {
    if (!eventoToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('eventos').delete().eq('id', eventoToDelete);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['eventos-list'] });
      setEventoToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyRecruitLink = () => {
    const url = `http://admin.eventos.com/recrutamento`; // Substituir pela URL correta
    navigator.clipboard.writeText(url);
    setCopiedId('recruit');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyEventoLink = (evento: any) => {
    const ref = vRef ? `?ref=${vRef}` : '';
    // Como a Vercel URL pode mudar, o ideal seria usar window.location.origin do public se fosse o mesmo app
    const publicOrigin = "https://rifa.virtudes.net.br"; // TODO: Atualizar URL pública
    const url = `${publicOrigin}/${evento.slug || evento.id}${ref}`;
    navigator.clipboard.writeText(url);
    setCopiedId(evento.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-500">Ativo</Badge>;
      case "desativado":
        return <Badge variant="secondary">Desativado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Eventos</h1>
          <p className="text-gray-500 dark:text-slate-400">
            {userRole === 'admin' ? "Gerencie todos os eventos do sistema." : "Confira os eventos disponíveis para divulgação."}
          </p>
        </div>
        {userRole === 'admin' && (
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={copyRecruitLink}>
              {copiedId === 'recruit' ? <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Copiado!</> : <><Shield className="mr-2 h-4 w-4" /> Recrutar Afiliado</>}
            </Button>
            <Button className="flex-1 sm:flex-none" render={<Link to="/eventos/novo" />} nativeButton={false}>
              <Plus className="mr-2 h-4 w-4" /> Novo Evento
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Nenhum evento encontrado</h3>
          <p className="text-gray-500 dark:text-slate-400">Crie seu primeiro evento para começar.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => {
            return (
              <Card key={evento.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow border border-blue-100/50 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative h-48 w-full bg-gray-200 dark:bg-slate-800 group">
                  {userRole === 'admin' ? (
                    <Link to={`/eventos/${evento.id}/editar`} className="block h-full w-full overflow-hidden">
                      {evento.imagem_url ? (
                        <img
                          src={evento.imagem_url}
                          alt={evento.titulo}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500">
                          Sem imagem
                        </div>
                      )}
                    </Link>
                  ) : (
                    <>
                      {evento.imagem_url ? (
                        <img
                          src={evento.imagem_url}
                          alt={evento.titulo}
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500">
                          Sem imagem
                        </div>
                      )}
                    </>
                  )}
                  <div className="absolute top-2 right-2 z-10">
                    {getStatusBadge(evento.status)}
                  </div>
                  <div className="absolute bottom-2 left-2 z-10">
                    <Badge variant="outline" className="bg-black/40 text-white border-none backdrop-blur-md text-[10px] py-0.5 px-2">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(evento.data_evento).toLocaleDateString('pt-BR')}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{evento.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400 mb-4">
                    <div className="flex justify-between">
                      <span>Ingresso:</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">R$ {Number(evento.valor_ingresso).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Progresso:</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {evento.ingressosVendidos} / {evento.capacidade} ({evento.progresso.toFixed(1)}%)
                      </span>
                    </div>

                    {evento.faturamentoLiquido > 0 && (
                       <div className="flex justify-between items-center border-t border-gray-100 dark:border-slate-800/60 pt-3 mt-3">
                        <span className="text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Arrecadado:</span>
                        <span className="font-black text-xl text-green-600 dark:text-green-400">
                          {evento.faturamentoLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    )}

                    <div className="w-full bg-gray-100 dark:bg-slate-950 rounded-full h-5 mt-3 relative overflow-hidden border border-gray-200/50 dark:border-slate-800/60">
                      <div
                        className="bg-blue-600 h-full transition-all duration-1000 flex items-center justify-end"
                        style={{ width: `${evento.progresso}%` }}
                      >
                        {evento.progresso > 30 && (
                          <span className="text-[10px] font-black text-white px-2 uppercase tracking-tighter">
                            {evento.ingressosVendidos} VENDIDOS
                          </span>
                        )}
                      </div>
                      {evento.progresso <= 30 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-tighter">
                            {evento.ingressosVendidos} VENDIDOS
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <div className="bg-gray-50/80 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 p-5 pt-4 rounded-b-xl flex flex-col gap-2.5 w-full">
                    {userRole === 'admin' && (
                      <div className="flex flex-col gap-2.5 w-full">
                        <Button 
                          variant="default" 
                          size="sm"
                          render={<Link to={`/eventos/${evento.id}/editar`} />}
                          nativeButton={false}
                          className="w-full h-11 text-sm font-bold bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md shadow-green-600/20 dark:shadow-green-900/30 rounded-xl"
                        >
                          <Edit className="h-4 w-4 mr-2" /> Editar Evento
                        </Button>

                        <div className="grid grid-cols-2 gap-2.5">
                          <Button
                            variant="secondary" 
                            size="sm"
                            onClick={() => copyEventoLink(evento)}
                            className="h-10 text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm rounded-xl"
                          >
                            {copiedId === evento.id ? (
                              <><CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" /> Copiado</>
                            ) : (
                              <><LinkIcon className="h-4 w-4 mr-1.5 text-blue-600" /> Copiar Link</>
                            )}
                          </Button>

                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              const publicOrigin = "https://rifa.virtudes.net.br";
                              window.open(`${publicOrigin}/${evento.slug || evento.id}${vRef ? `?ref=${vRef}` : ''}`, '_blank');
                            }}
                            className="h-10 text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm rounded-xl"
                          >
                            <Eye className="h-4 w-4 mr-1.5 text-indigo-600" /> Página
                          </Button>
                        </div>
                      </div>
                    )}

                    {userRole === 'afiliado' && (
                      <div className="flex flex-col gap-2.5 w-full">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            const publicOrigin = "https://rifa.virtudes.net.br";
                            window.open(`${publicOrigin}/${evento.slug || evento.id}?ref=${vRef}`, '_blank');
                          }}
                          className="w-full h-11 text-sm font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm rounded-xl"
                        >
                          <Eye className="h-4 w-4 mr-2 text-indigo-600" /> Ver Página
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          className="w-full h-11 text-sm font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:shadow-blue-900/30 rounded-xl"
                          onClick={() => {
                            const publicOrigin = "https://rifa.virtudes.net.br";
                            const myRefLink = `${publicOrigin}/${evento.slug || evento.id}${vRef ? `?ref=${vRef}` : ''}`;
                            navigator.clipboard.writeText(myRefLink);
                            setCopiedId(evento.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                        >
                           {copiedId === evento.id ? <><CheckCircle2 className="h-4 w-4 mr-2" /> COPIADO!</> : <><LinkIcon className="h-4 w-4 mr-2" /> COPIAR MEU LINK</>}
                        </Button>
                      </div>
                    )}
                  </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!eventoToDelete} onOpenChange={(open) => !open && setEventoToDelete(null)}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>Excluir Evento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita e apagará todos os pedidos associados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventoToDelete(null)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
