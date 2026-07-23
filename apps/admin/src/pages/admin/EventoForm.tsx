import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Image as ImageIcon, Upload, Trash, Loader2, Trophy } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function EventoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    capacidade: "",
    valorIngresso: "",
    dataEvento: "",
    horarioEvento: "",
    localEvento: "",
    timeoutReserva: "10",
    imagemUrl: "",
    videoUrl: "",
    slug: "",
    metaGuardiao: "50",
    status: "ativo",
    offPrice: "",
    qtdOff: ""
  });

  const [hasSoldTickets, setHasSoldTickets] = useState(false);
  const [initialCapacidade, setInitialCapacidade] = useState<number>(0);

  useEffect(() => {
    if (isEditing) {
      fetchEvento();
    }
  }, [id]);

  async function fetchEvento() {
    try {
      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .select(`*`)
        .eq('id', id)
        .single();
        
      if (eventoError) throw eventoError;

      // Verificar se existem ingressos vendidos
      const { data: pedidosPagos } = await supabase
        .from('pedidos')
        .select('quantidade')
        .eq('evento_id', id)
        .in('status', ['pago', 'pendente']);

      const vendidos = pedidosPagos?.reduce((acc, p) => acc + (p.quantidade || 0), 0) || 0;
      setHasSoldTickets(vendidos > 0);

      // Format date for datetime-local input (YYYY-MM-DDThh:mm)
      let formattedDate = "";
      if (evento.data_evento) {
        const dateObj = new Date(evento.data_evento);
        formattedDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      }

      setFormData({
        titulo: evento.titulo,
        descricao: evento.descricao || "",
        capacidade: evento.capacidade.toString(),
        valorIngresso: evento.valor_ingresso.toString(),
        dataEvento: formattedDate,
        horarioEvento: evento.horario_evento || "",
        localEvento: evento.local_evento || "",
        timeoutReserva: evento.timeout_reserva.toString(),
        imagemUrl: evento.imagem_url || "",
        videoUrl: evento.video_url || "",
        slug: evento.slug || "",
        metaGuardiao: evento.meta_guardiao ? evento.meta_guardiao.toString() : "50",
        status: evento.status,
        offPrice: evento.off_price ? evento.off_price.toString() : "",
        qtdOff: evento.qtd_off ? evento.qtd_off.toString() : ""
      });
      setInitialCapacidade(evento.capacidade);

    } catch (error) {
      console.error("Erro ao buscar evento:", error);
      toast.error("Erro ao carregar dados do evento.");
      navigate("/eventos");
    } finally {
      setInitialLoading(false);
    }
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTituloChange = (titulo: string) => {
    const newSlug = generateSlug(titulo);
    setFormData({
      ...formData,
      titulo,
      slug: isEditing ? formData.slug : newSlug
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.warning("Por favor, selecione uma imagem válida (JPG, PNG, WEBP ou GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.warning("A imagem é muito grande. O limite é de 5MB.");
      return;
    }

    try {
      setUploadingImage(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `eventos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      
      setFormData({ ...formData, imagemUrl: data.publicUrl });
      
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error(`Erro no upload: ${error.message || "Erro desconhecido"}`);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de Preço Promocional
    if (formData.offPrice && formData.valorIngresso) {
      if (parseFloat(formData.offPrice) >= parseFloat(formData.valorIngresso)) {
        toast.warning("O preço promocional deve ser menor que o preço normal do ingresso.");
        return;
      }
    }

    setLoading(true);

    try {
      let eventoId = id;

      const eventoPayload: any = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        capacidade: parseInt(formData.capacidade),
        valor_ingresso: parseFloat(formData.valorIngresso),
        data_evento: new Date(formData.dataEvento).toISOString(),
        horario_evento: formData.horarioEvento || (formData.dataEvento.includes('T') ? formData.dataEvento.split('T')[1] : null),
        local_evento: formData.localEvento || null,
        timeout_reserva: parseInt(formData.timeoutReserva),
        imagem_url: formData.imagemUrl || null,
        video_url: formData.videoUrl || null,
        slug: formData.slug || null,
        meta_guardiao: parseInt(formData.metaGuardiao) || 50,
        status: formData.status,
        off_price: formData.offPrice ? parseFloat(formData.offPrice) : null,
        qtd_off: formData.qtdOff ? parseInt(formData.qtdOff) : null
      };

      if (isEditing) {
        // Update existing
        const { error: eventoError } = await supabase
          .from('eventos')
          .update(eventoPayload)
          .eq('id', id);
          
        if (eventoError) throw eventoError;
      } else {
        // Insert new
        eventoPayload.status = formData.status || 'ativo';
        const { data: eventoData, error: eventoError } = await supabase
          .from('eventos')
          .insert(eventoPayload)
          .select()
          .single();

        if (eventoError) throw eventoError;
        eventoId = eventoData.id;
      }

      navigate("/eventos");
    } catch (error: any) {
      console.error("Erro ao salvar evento:", error);
      toast.error(`Erro ao salvar o evento: ${error?.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('eventos').delete().eq('id', id);
      if (error) throw error;
      navigate("/eventos");
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      toast.error("Erro ao excluir o evento.");
    } finally {
      setIsDeleting(false);
      setEventoToDelete(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" render={<Link to="/eventos" />} nativeButton={false}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{isEditing ? "Editar Evento" : "Novo Evento"}</h1>
          <p className="text-gray-500 dark:text-slate-400">{isEditing ? "Altere os dados do evento existente." : "Preencha os dados para criar um novo evento."}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título do Evento</Label>
                  <Input 
                    id="titulo" 
                    placeholder="Ex: Festa de Fim de Ano" 
                    required 
                    value={formData.titulo}
                    onChange={e => handleTituloChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug do Evento (URL amigável)</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 dark:text-slate-550 text-sm">/evento/</span>
                    <Input 
                      id="slug" 
                      placeholder="festa-de-fim-de-ano" 
                      required 
                      value={formData.slug}
                      onChange={e => setFormData({...formData, slug: generateSlug(e.target.value)})}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Este será o link: sua-url.com/evento/<strong>{formData.slug || "titulo-do-evento"}</strong></p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea 
                    id="descricao" 
                    placeholder="Descreva as atrações, regras e detalhes importantes..." 
                    className="min-h-[120px]"
                    value={formData.descricao}
                    onChange={e => setFormData({...formData, descricao: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Local e Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataEvento">Data do Evento</Label>
                    <Input 
                      id="dataEvento" 
                      type="date" 
                      required 
                      value={formData.dataEvento}
                      onChange={e => setFormData({...formData, dataEvento: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horarioEvento">Horário de Abertura</Label>
                    <Input 
                      id="horarioEvento" 
                      type="time" 
                      value={formData.horarioEvento}
                      onChange={e => setFormData({...formData, horarioEvento: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localEvento">Local / Endereço</Label>
                  <Textarea 
                    id="localEvento" 
                    placeholder="Ex: Espaço das Américas - Av. das Nações Unidas, 123"
                    value={formData.localEvento}
                    onChange={e => setFormData({...formData, localEvento: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Ingressos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacidade">Capacidade (Total de Ingressos)</Label>
                    <Input 
                      id="capacidade" 
                      type="number" 
                      placeholder="Ex: 500" 
                      required 
                      min={hasSoldTickets ? initialCapacidade : "1"}
                      value={formData.capacidade}
                      onChange={e => setFormData({...formData, capacidade: e.target.value})}
                    />
                    {hasSoldTickets && (
                      <p className="text-xs text-yellow-600 font-medium leading-tight">
                        ⚠️ Atenção: Como já existem vendas, você <b>só pode aumentar</b> a capacidade (mínimo de {initialCapacidade}).
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorIngresso">Valor do Ingresso (R$)</Label>
                    <Input 
                      id="valorIngresso" 
                      type="number" 
                      step="0.01" 
                      placeholder="Ex: 50.00" 
                      required 
                      min="0"
                      value={formData.valorIngresso}
                      onChange={e => setFormData({...formData, valorIngresso: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeoutReserva">Tempo de Reserva (minutos)</Label>
                    <Input 
                      id="timeoutReserva" 
                      type="number" 
                      required 
                      min="1"
                      value={formData.timeoutReserva}
                      onChange={e => setFormData({...formData, timeoutReserva: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaGuardiao">Meta de Vendas p/ Afiliado</Label>
                    <Input 
                      id="metaGuardiao" 
                      type="number" 
                      required 
                      min="1"
                      value={formData.metaGuardiao}
                      onChange={e => setFormData({...formData, metaGuardiao: e.target.value})}
                    />
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 italic">Meta universal (em ingressos) para afiliados.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-3 flex items-center">
                    <Trophy className="h-4 w-4 mr-2" /> Preço Promocional para Grupos
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="offPrice">Preço Promocional (R$)</Label>
                      <Input 
                        id="offPrice" 
                        type="number" 
                        step="0.01" 
                        placeholder="Ex: 40.00" 
                        value={formData.offPrice}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData({...formData, offPrice: val});
                        }}
                      />
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">Valor do ingresso se atingir a qtd. mínima.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtdOff">Qtd Mínima para Promoção</Label>
                      <Input 
                        id="qtdOff" 
                        type="number" 
                        placeholder="Ex: 5" 
                        min="2"
                        value={formData.qtdOff}
                        onChange={e => setFormData({...formData, qtdOff: e.target.value})}
                      />
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">A partir de quantos ingressos o desconto se aplica.</p>
                    </div>
                  </div>
                  {formData.offPrice && formData.valorIngresso && parseFloat(formData.offPrice) >= parseFloat(formData.valorIngresso) && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 font-medium">⚠️ Atenção: O preço promocional deve ser menor que o preço normal.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status do Evento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Visibilidade</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({...formData, status: value})}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desativado">Desativado (Rascunho)</SelectItem>
                        <SelectItem value="ativo">Ativo (Visível ao Público)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.status === 'desativado' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                      Eventos desativados não são visíveis para o público.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Banner Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-slate-800 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-900 relative overflow-hidden">
                      {formData.imagemUrl ? (
                        <img src={formData.imagemUrl} alt="Preview" className="object-cover w-full h-full absolute inset-0" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingImage ? (
                            <Loader2 className="w-8 h-8 mb-4 text-gray-500 dark:text-slate-400 animate-spin" />
                          ) : (
                            <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-slate-400" />
                          )}
                          <p className="mb-2 text-sm text-gray-500 dark:text-slate-400"><span className="font-semibold">Clique para fazer upload</span></p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">PNG, JPG ou WEBP</p>
                        </div>
                      )}
                      <input 
                        id="dropzone-file" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imagemUrl">Ou cole a URL da Imagem</Label>
                    <Input 
                      id="imagemUrl" 
                      placeholder="https://exemplo.com/imagem.jpg" 
                      value={formData.imagemUrl}
                      onChange={e => setFormData({...formData, imagemUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <Label htmlFor="videoUrl">URL do Vídeo (Será exibido em loop no lugar da imagem)</Label>
                    <Input 
                      id="videoUrl" 
                      placeholder="https://exemplo.com/video.mp4" 
                      value={formData.videoUrl}
                      onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button type="submit" className="w-full" disabled={loading || uploadingImage}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isEditing ? "Salvar Alterações" : "Criar Evento"}
                </Button>
                <Button type="button" variant="outline" className="w-full" render={<Link to="/eventos" />} nativeButton={false} disabled={loading || uploadingImage}>
                  Cancelar
                </Button>
              </CardContent>
            </Card>

            {isEditing && (
              <Card className="border-red-100 dark:border-red-950/50 bg-red-50/30 dark:bg-red-950/10">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400 text-sm">Zona de Risco</CardTitle>
                </CardHeader>
                <CardContent>
                  <button 
                    type="button" 
                    onClick={() => setEventoToDelete(id)}
                    className="text-red-400 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors flex items-center"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Excluir este Evento
                  </button>
                  <p className="text-[10px] text-red-400 dark:text-red-400/80 mt-2">Esta ação é irreversível e excluirá todos os dados.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>

      <Dialog open={!!eventoToDelete} onOpenChange={(open) => !open && setEventoToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Evento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventoToDelete(null)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
              Excluir Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
