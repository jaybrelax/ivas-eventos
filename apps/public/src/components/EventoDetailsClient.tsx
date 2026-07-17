"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle, Loader2, Copy, Ticket, X,
  User, CreditCard, Phone, Mail, Shield, ArrowRight, Wallet, Minus, Plus, Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDescription } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface EventoDetailsClientProps {
  initialEvento: any;
  config: any;
}

export default function EventoDetailsClient({ initialEvento, config }: EventoDetailsClientProps) {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [evento] = useState<any>(initialEvento);
  const [quantidade, setQuantidade] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isAtTicketsSection, setIsAtTicketsSection] = useState(false);
  const ticketsRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);

  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem("@evento:client_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            nome: parsed.nome || "",
            cpf: parsed.cpf || "",
            email: parsed.email || "",
            telefone: parsed.telefone || ""
          };
        }
      } catch { }
    }
    return { nome: "", cpf: "", email: "", telefone: "" };
  });

  const [acompanhantes, setAcompanhantes] = useState<string[]>([]);

  // Sync acompanhantes length with quantidade - 1
  useEffect(() => {
    const targetLength = Math.max(0, quantidade - 1);
    setAcompanhantes(prev => {
      if (prev.length === targetLength) return prev;
      if (prev.length < targetLength) {
        return [...prev, ...Array(targetLength - prev.length).fill("")];
      }
      return prev.slice(0, targetLength);
    });
  }, [quantidade]);

  useEffect(() => {
    const el = ticketsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtTicketsSection(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const [pixData, setPixData] = useState<{ qr_code_base64?: string; qr_code?: string; payment_id?: string } | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showCpfCorrection, setShowCpfCorrection] = useState(false);

  useEffect(() => {
    if (refCode && typeof window !== 'undefined') {
      localStorage.setItem("@evento:vendedor_ref", refCode);
    }
  }, [refCode]);

  // Poll de pagamento
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checkoutStep === 4 && pedidoId) {
      interval = setInterval(async () => {
        try {
          const { data, error } = await supabase.from("pedidos").select("status").eq("id", pedidoId).single();
          if (!error && data && data.status === "pago") {
            if (typeof window !== 'undefined') {
              localStorage.setItem("@evento:client_data", JSON.stringify(formData));
            }
            setCheckoutStep(5);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Erro ao verificar status:", err);
        }
      }, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [checkoutStep, pedidoId, formData]);

  // Timer do PIX
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (checkoutStep === 4 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && checkoutStep === 4) {
      setCheckoutStep(3);
      setCheckoutError("O tempo para pagamento expirou. Por favor, gere um novo PIX.");
      setTimeLeft(600);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [checkoutStep, timeLeft]);

  const handleCheckout = async () => {
    if (!evento) return;
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const vendedorRef = typeof window !== 'undefined' ? localStorage.getItem("@evento:vendedor_ref") : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const response = await fetch(`${apiUrl}/api/pagamento/pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: evento.id,
          cliente: { nome: formData.nome, cpf: formData.cpf, email: formData.email, telefone: formData.telefone },
          quantidade: quantidade,
          convidados: [formData.nome, ...acompanhantes].map(c => c.trim()).filter(c => c),
          vendedor_ref: vendedorRef,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao processar pedido");
      setPedidoId(data.pedido_id);
      setPixData(data);
      setTimeLeft(600);
      setCheckoutStep(4);
    } catch (error: any) {
      if (error.message?.includes("Invalid user identification number") || error.message?.includes("invalid identification.number")) {
        setCheckoutError("CPF inválido! Corrija abaixo para continuar.");
        setShowCpfCorrection(true);
      } else {
        setCheckoutError(error.message || "Ocorreu um erro ao gerar o pagamento. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  const copyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const hasPromo = evento.off_price && evento.qtd_off;
  const isPromoActive = hasPromo && quantidade >= evento.qtd_off;
  const currentUnitPrice = isPromoActive ? evento.off_price : evento.valor_ingresso;
  const totalValue = quantidade * currentUnitPrice;

  return (
    <div className="bg-gray-50 pb-28 md:pb-12">
      {/* ── HERO ── */}
      <div className="relative h-56 sm:h-64 md:h-80 w-full bg-gray-900">
        {evento.imagem_url ? (
          <img src={evento.imagem_url} alt={evento.titulo} className="object-cover w-full h-full opacity-60" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-900 opacity-80" />
        )}
        <div className="absolute top-3 left-3">
          <Link href="/">
            <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-gray-900 shadow">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 to-transparent">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] bg-white/20 backdrop-blur-md border border-white/30 text-white mb-3 shadow-lg">
              EVENTO
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-white mb-1 leading-tight">{evento.titulo}</h1>
            <div className="flex items-center text-gray-300 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Data: {new Date(evento.data_evento).toLocaleDateString("pt-BR")} {evento.horario_evento ? `às ${evento.horario_evento}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 md:py-8">
        <div className="flex flex-col md:grid md:grid-cols-3 gap-5 md:gap-8">

          {/* Coluna principal */}
          <div className="md:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold mb-3">Sobre o Evento</h2>

                {evento.local_evento && (
                  <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-bold">Local:</span> {evento.local_evento}
                  </div>
                )}

                <div className={`relative overflow-hidden transition-all duration-500 ease-in-out ${isDescriptionExpanded ? 'max-h-[5000px]' : 'max-h-[300px]'}`}>
                  <p className="text-gray-600 text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: formatDescription(evento.descricao || "Sem descrição disponível.") }} />
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none flex items-end justify-center pb-2" />
                  )}
                </div>
                {evento.descricao && evento.descricao.length > 200 && (
                  <div className="flex justify-center mt-2">
                    <Button
                      variant="ghost"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="text-[#1a6eff] hover:text-blue-700 hover:bg-blue-50 font-bold uppercase tracking-wider text-xs"
                    >
                      {isDescriptionExpanded ? "Ler menos" : "Ler mais"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price section for mobile */}
            <Card className="md:hidden border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 leading-tight">Valor do ingresso</p>
                      <p className="text-[13px] text-gray-500 uppercase tracking-wider font-semibold">Por pessoa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-black text-green-600 ${isPromoActive ? 'line-through text-gray-400 text-lg' : ''}`}>
                      R$ {Number(evento.valor_ingresso).toFixed(2)}
                    </p>
                    {isPromoActive && (
                      <p className="text-3xl font-black text-green-600 animate-pulse">
                        R$ {Number(evento.off_price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {hasPromo && !isPromoActive && (
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-3 rounded-xl text-center text-sm font-medium animate-pulse shadow-md">
                    🚀 PROMOÇÃO: Compre {evento.qtd_off} ou mais e pague apenas <span className="text-yellow-300 font-bold text-base">R$ {Number(evento.off_price).toFixed(2)}</span> por ingresso!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selector de Ingressos */}
            <Card id="comprar" ref={ticketsRef} className="scroll-mt-[170px]">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-6">Quantos ingressos?</h2>

                <div className="flex items-center justify-between p-4 sm:p-6 bg-gray-50 border border-gray-200 rounded-2xl mb-4 shadow-inner">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-lg">Quantidade</span>
                    <span className="text-xs text-gray-500 font-medium">Compre o seu e de acompanhantes juntos</span>
                  </div>
                  <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                      disabled={quantidade <= 1}
                      className="rounded-lg h-10 w-10 text-gray-600 hover:text-blue-600 border-gray-200"
                    ><Minus className="h-5 w-5" /></Button>
                    <span className="text-2xl font-black w-8 text-center text-blue-600">{quantidade}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantidade(quantidade + 1)}
                      className="rounded-lg h-10 w-10 text-gray-600 hover:text-blue-600 border-gray-200"
                    ><Plus className="h-5 w-5" /></Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Sidebar Desktop */}
          <div className="md:col-span-1 hidden md:block">
            <div className="sticky top-24">
              <Card className="border-blue-200 shadow-lg">
                <CardContent className="p-5">
                  <h3 className="text-lg font-bold mb-4">Resumo da Compra</h3>
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">Valor unitário</span>
                    <div className="text-right">
                      <span className={`font-bold block ${isPromoActive ? 'line-through text-gray-400 text-xs' : ''}`}>R$ {Number(evento.valor_ingresso).toFixed(2)}</span>
                      {isPromoActive && <span className="font-bold text-green-600">R$ {Number(evento.off_price).toFixed(2)}</span>}
                    </div>
                  </div>
                  <div className="mb-5 flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-bold">Quantidade:</span>
                    <span className="text-lg font-black text-blue-600">{quantidade}x</span>
                  </div>
                  <div className="flex justify-between items-center mb-5 pt-4 border-t border-gray-100">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-extrabold text-green-600">R$ {totalValue.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full h-14 rounded-full text-base uppercase font-bold shadow-lg transition-all duration-300 bg-[#1b5df1] hover:bg-[#0044cc] text-white font-black scale-[1.02]"
                    onClick={() => {
                      setCheckoutStep(1);
                      setIsModalOpen(true);
                    }}
                  >
                    Comprar Ingressos
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-xl border-t border-white/20 px-4 py-4 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-300">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2 flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">{quantidade} Ingressos</p>
            <p className="text-xl font-extrabold text-green-600 leading-tight">R$ {totalValue.toFixed(2)}</p>
          </div>
          <Button
            className={`h-12 px-6 uppercase text-xs sm:text-sm font-bold rounded-full transition-all duration-300 text-white font-black shadow-lg ${isAtTicketsSection
              ? "bg-[#22c55e] hover:bg-[#16a34a] shadow-green-500/20"
              : "bg-gray-900 hover:bg-gray-800 shadow-gray-900/20"
              }`}
            onClick={() => {
              if (isAtTicketsSection) {
                setCheckoutStep(1);
                setIsModalOpen(true);
              } else {
                ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setIsAtTicketsSection(true);
              }
            }}
          >
            {isAtTicketsSection ? "Prosseguir com a compra" : "Comprar Agora"}
          </Button>
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="!fixed !top-0 !left-0 !translate-x-0 !translate-y-0 !m-0 !w-full !max-w-none !h-[100dvh] !rounded-none border-none p-0 overflow-y-auto flex flex-col bg-white sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!max-w-[450px] sm:!h-auto sm:!max-h-[82vh] sm:!rounded-[32px] sm:border">
          {(checkoutStep === 1 || checkoutStep === 2 || checkoutStep === 3) && (
            <div className="flex-1 flex flex-col pb-8">
              {/* Custom Header Checkout */}
              <div className="sticky top-0 bg-white z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 shadow-sm">
                <button
                  onClick={() => {
                    if (checkoutStep === 1) {
                      setIsModalOpen(false);
                    } else if (checkoutStep === 3 && quantidade === 1) {
                      setCheckoutStep(1);
                    } else {
                      setCheckoutStep(checkoutStep - 1);
                    }
                  }}
                  className="p-2 hover:bg-slate-50 rounded-full transition-colors relative z-10"
                >
                  <ArrowLeft className={`h-[22px] w-[22px] text-[#0055ff]`} />
                </button>
                <h3 className={`text-lg font-bold absolute left-1/2 -translate-x-1/2 tracking-tight text-[#0055ff]`}>Checkout</h3>
                <div className="w-10"></div>
              </div>

              <div className="px-5 sm:px-8 pt-8 flex-1">
                <div className="text-center mb-10">
                  <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-2 leading-tight">
                    {checkoutStep === 1 ? "Seus Dados" : checkoutStep === 2 ? "Acompanhantes" : "Resumo da Compra"}
                  </h2>
                  <p className="text-slate-500 font-medium text-[15px]">
                    {checkoutStep === 1 ? "Preencha seus dados como titular" : checkoutStep === 2 ? "Nome das pessoas que utilizarão o ingresso" : "Confira os detalhes"}
                  </p>
                </div>

                {checkoutStep === 1 && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 sm:p-7 rounded-[32px] space-y-6 border border-slate-100 shadow-sm shadow-slate-200/50">

                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-4 px-1.5 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest z-10 peer-focus:text-[#1b5df1] transition-colors rounded">Nome e Sobrenome</Label>
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#1b5df1] z-10 transition-colors" />
                        <Input
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          placeholder="Ex: João da Silva"
                          className="peer h-[56px] pl-[42px] rounded-[16px] border-2 border-slate-200 bg-transparent focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:shadow-[0_4px_12px_rgba(27,93,241,0.06)] font-bold text-slate-800 placeholder:text-slate-300 focus:border-[#1b5df1] focus:ring-0 text-[15px] transition-all"
                        />
                      </div>

                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-4 px-1.5 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest z-10 peer-focus:text-[#1b5df1] transition-colors rounded">CPF</Label>
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#1b5df1] z-10 transition-colors" />
                        <Input
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          className="peer h-[56px] pl-[42px] rounded-[16px] border-2 border-slate-200 bg-transparent focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:shadow-[0_4px_12px_rgba(27,93,241,0.06)] font-bold text-slate-800 placeholder:text-slate-300 focus:border-[#1b5df1] focus:ring-0 font-mono text-[15px] transition-all"
                        />
                      </div>

                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-4 px-1.5 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest z-10 peer-focus:text-[#1b5df1] transition-colors rounded">WhatsApp / Telefone</Label>
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#1b5df1] z-10 transition-colors" />
                        <Input
                          value={formData.telefone}
                          onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          inputMode="numeric"
                          className="peer h-[56px] pl-[42px] rounded-[16px] border-2 border-slate-200 bg-transparent focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:shadow-[0_4px_12px_rgba(27,93,241,0.06)] font-bold text-slate-800 placeholder:text-slate-300 focus:border-[#1b5df1] focus:ring-0 font-mono text-[15px] transition-all"
                        />
                      </div>

                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-4 px-1.5 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest z-10 peer-focus:text-[#1b5df1] transition-colors rounded">E-mail</Label>
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#1b5df1] z-10 transition-colors" />
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="seu@email.com"
                          className="peer h-[56px] pl-[42px] rounded-[16px] border-2 border-slate-200 bg-transparent focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:shadow-[0_4px_12px_rgba(27,93,241,0.06)] font-bold text-slate-800 placeholder:text-slate-300 focus:border-[#1b5df1] focus:ring-0 text-[15px] transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-6">
                      <Button
                        className="h-14 rounded-full bg-[#1b5df1] hover:bg-[#0044cc] text-[15px] font-bold uppercase tracking-widest shadow-[0_8px_20px_rgba(27,93,241,0.25)] transition-all active:scale-[0.98]"
                        onClick={() => {
                          if (!formData.nome || !formData.cpf || !formData.telefone || !formData.email) {
                            setCheckoutError("Preencha todos os campos para continuar");
                            return;
                          }
                          setCheckoutError(null);
                          if (quantidade > 1) {
                            setCheckoutStep(2);
                          } else {
                            setCheckoutStep(3);
                          }
                        }}
                      >
                        Continuar <ArrowRight className="ml-1 h-5 w-5" />
                      </Button>
                      <p className="text-[12px] text-slate-400 font-medium text-center leading-relaxed px-4">
                        Ao continuar, você concorda com os{" "}
                        <Link href="/termos" target="_blank" className="text-[#1b5df1] font-bold underline">Termos</Link> e{" "}
                        <Link href="/privacidade" target="_blank" className="text-[#1b5df1] font-bold underline">Privacidade</Link>.
                      </p>
                    </div>
                  </div>
                )}

                {checkoutStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 sm:p-7 rounded-[32px] space-y-5 border border-slate-100 shadow-sm shadow-slate-200/50">
                      <div className="flex items-center gap-3 text-blue-600 font-bold mb-8 bg-blue-100/50 p-3 rounded-xl border border-blue-200/50">
                        <Users className="h-5 w-5 shrink-0" />
                        <span className="text-sm">Você selecionou {quantidade} ingresso(s). Informe seus acompanhantes.</span>
                      </div>

                      {acompanhantes.map((nome, index) => (
                        <div key={index} className="relative group">
                          <Label className="absolute -top-2.5 left-4 px-1.5 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest z-10 peer-focus:text-[#1b5df1] transition-colors rounded">
                            Acompanhante {index + 1}
                          </Label>
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#1b5df1] z-10 transition-colors" />
                          <Input
                            value={nome}
                            onChange={(e) => {
                              const newAcompanhantes = [...acompanhantes];
                              newAcompanhantes[index] = e.target.value;
                              setAcompanhantes(newAcompanhantes);
                            }}
                            placeholder="Nome Completo"
                            className="peer h-[56px] pl-[42px] rounded-[16px] border-2 border-slate-200 bg-transparent focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:shadow-[0_4px_12px_rgba(27,93,241,0.06)] font-bold text-slate-800 placeholder:text-slate-300 focus:border-[#1b5df1] focus:ring-0 text-[15px] transition-all"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-4 mt-6">
                      <Button
                        className="h-14 rounded-full bg-[#1b5df1] hover:bg-[#0044cc] text-[15px] font-bold uppercase tracking-widest shadow-[0_8px_20px_rgba(27,93,241,0.25)] transition-all active:scale-[0.98]"
                        onClick={() => {
                          if (acompanhantes.some(c => !c.trim())) {
                            setCheckoutError("Preencha o nome de todos os acompanhantes.");
                            return;
                          }
                          setCheckoutError(null);
                          setCheckoutStep(3);
                        }}
                      >
                        Revisar Compra <ArrowRight className="ml-1 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {checkoutStep === 3 && (
                  <div className="space-y-3.5">
                    {checkoutError && (
                      <div className="p-3 bg-[#ffecec] border border-[#ffcccc] text-[#d32f2f] text-[13px] font-bold rounded-[16px] flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="h-6 w-6 rounded-full bg-[#d32f2f] flex items-center justify-center shrink-0">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                        {checkoutError}
                      </div>
                    )}
                    {showCpfCorrection && (
                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[10px] font-black uppercase text-slate-500 tracking-widest z-10 rounded">CPF</Label>
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#d32f2f] z-10 transition-colors" />
                        <Input
                          value={formData.cpf}
                          onChange={(e) => {
                            setFormData({ ...formData, cpf: formatCPF(e.target.value) });
                          }}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          className="peer h-[56px] pl-[42px] rounded-[16px] border-2 border-[#ffcccc] bg-[#fff5f5] focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] font-bold text-slate-800 placeholder:text-slate-300 focus:border-[#d32f2f] focus:ring-0 font-mono text-[15px] transition-all"
                        />
                      </div>
                    )}

                    <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 border border-slate-100 shadow-sm">
                      <div className="h-11 w-11 rounded-full bg-slate-50 flex items-center justify-center text-[#1b5df1] shrink-0 border border-slate-100">
                        <User className="h-[20px] w-[20px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-900 text-[16px] leading-tight truncate">{formData.nome}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-[11px] text-slate-500 font-bold tracking-tight">{formData.cpf}</p>
                          <div className="h-3 w-[1px] bg-slate-200"></div>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <Phone className="h-[10px] w-[10px] text-[#1b5df1]" />
                            <p className="text-[11px] text-slate-500 font-bold truncate">{formData.telefone}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#eff6ff] rounded-[20px] p-5 border border-blue-100 shadow-sm space-y-3 mb-[14px]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] uppercase font-black text-blue-600 tracking-widest">Ingressos</h4>
                        <span className="font-bold text-blue-800 bg-blue-200/50 px-2.5 py-0.5 rounded-full text-[10px]">{quantidade} UNID</span>
                      </div>
                      <div className="flex flex-col gap-2 pt-2 border-t border-blue-200/50">
                        <div className="flex items-center text-sm font-semibold text-blue-900">
                          <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs mr-2">1</div>
                          {formData.nome} (Você)
                        </div>
                        {acompanhantes.map((c, i) => (
                          <div key={i} className="flex items-center text-sm font-semibold text-blue-900">
                            <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs mr-2">{i + 2}</div>
                            {c}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#f8fafc] rounded-[24px] py-6 px-5 mt-8 border border-slate-100/60 shadow-sm shadow-slate-100 text-center space-y-1 relative">
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#dcfce7] text-[#166534] text-[10px] font-black uppercase tracking-widest border border-green-200 shadow-sm">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Pagamento Seguro
                      </div>
                      <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider pt-1">Total a Pagar</p>
                      <p className="text-[42px] font-black text-[#006b2d] tracking-tighter leading-none">
                        R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <Button
                        disabled={isSubmitting}
                        className="h-14 rounded-full bg-[#006b2d] hover:bg-[#005a26] text-[15px] font-bold uppercase tracking-widest shadow-[0_8px_20px_rgba(0,107,45,0.25)] transition-all active:scale-[0.98]"
                        onClick={handleCheckout}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin h-5 w-5 mr-2 shrink-0" />
                            Aguarde...
                          </>
                        ) : (
                          <>
                            <Wallet className="mr-2.5 h-5 w-5" />
                            Finalizar e Pagar via PIX
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {checkoutStep === 4 && (
            <div className="flex-1 flex flex-col min-h-[100dvh] sm:min-h-0 sm:h-[90vh] sm:max-h-[700px] overflow-hidden bg-gradient-to-b from-[#0a1854] via-[#0d2080] to-[#1035c4] text-white relative animate-in fade-in duration-500">
              {showCloseConfirmation && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowCloseConfirmation(false)}></div>
                  <div className="relative bg-white rounded-[32px] p-8 max-w-[320px] w-full text-center shadow-2xl">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Atenção!</h3>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8">
                      Você ainda não confirmou o pagamento. Se fechar agora, perderá sua reserva em alguns minutos. Deseja realmente sair?
                    </p>
                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          setShowCloseConfirmation(false);
                          setIsModalOpen(false);
                        }}
                        variant="ghost"
                        className="w-full h-12 text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 rounded-2xl"
                      >
                        Sim, desejo sair
                      </Button>
                      <Button
                        onClick={() => setShowCloseConfirmation(false)}
                        className="w-full h-14 bg-[#1b5df1] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg"
                      >
                        Voltar ao PIX
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                <h2 className="text-lg font-black uppercase tracking-widest text-white">Pagamento PIX</h2>
                <button
                  onClick={() => setShowCloseConfirmation(true)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-white/80" />
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-5">
                <div className="w-full max-w-[260px] mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Tempo restante</span>
                    <span className="text-[14px] font-black text-white">{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="w-full bg-blue-900/50 rounded-full h-2 overflow-hidden border border-white/10">
                    <div
                      className="bg-green-400 h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                      style={{
                        width: `${(timeLeft / 600) * 100}%`,
                        backgroundColor: timeLeft < 120 ? '#ef4444' : timeLeft < 300 ? '#eab308' : '#4ade80'
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-[28px] shadow-2xl p-5 flex items-center justify-center w-full max-w-[260px] aspect-square relative z-10">
                  {pixData?.qr_code_base64 ? (
                    <img
                      src={`data:image/jpeg;base64,${pixData?.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-full h-auto mix-blend-multiply"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-300">
                      <Loader2 className="h-12 w-12 animate-spin" />
                    </div>
                  )}
                </div>

                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Logo_-_pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.png/1280px-Logo_-_pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.png"
                  alt="Logo Pix"
                  className="h-8 w-auto object-contain brightness-0 invert opacity-95"
                />

                <div className="text-center">
                  <p className="text-[11px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">Valor a pagar</p>
                  <p className="text-[52px] font-black text-white leading-none tracking-tight">R$ {totalValue.toFixed(2)}</p>
                </div>
              </div>

              <div className="shrink-0 px-6 pb-8 pt-2 space-y-3">
                <Button
                  onClick={copyPix}
                  className="w-full h-[58px] bg-[#22c55e] hover:bg-[#16a34a] text-white text-base font-black uppercase tracking-widest rounded-[18px] shadow-xl shadow-green-900/30 active:scale-[0.98] transition-all border-none"
                >
                  {pixCopied ? (
                    <><CheckCircle2 className="mr-3 h-5 w-5" /> Copiado!</>
                  ) : (
                    <><Copy className="mr-3 h-5 w-5" /> Copiar Código PIX</>
                  )}
                </Button>

                <div className="flex flex-col items-center gap-2 pt-1">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-300 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Aguardando Pagamento</span>
                  </div>
                  <p className="text-[10px] text-white/60 text-center uppercase font-bold leading-snug tracking-widest">
                    Não saia desta tela após pagar<br />A confirmação é automática
                  </p>
                </div>
              </div>
            </div>
          )}

          {checkoutStep === 5 && (
            <div className="p-10 flex flex-col items-center text-center flex-1 justify-center bg-white min-h-screen sm:min-h-0 sm:rounded-xl">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 mb-8">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-4">SUCESSO!</h2>
              <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-[280px] mx-auto">
                Parabéns, {formData.nome.split(' ')[0]}! Seus ingressos estão garantidos.
              </p>

              <div className="mt-10 p-4 bg-green-50 border border-green-100 rounded-[20px] flex items-center gap-3 text-[#008000] text-sm font-bold">
                <Shield className="h-5 w-5 shrink-0" />
                Seu comprovante foi enviado para o WhatsApp cadastrado.
              </div>

              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  window.location.reload();
                }}
                className="mt-10 w-full h-16 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                Finalizar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
