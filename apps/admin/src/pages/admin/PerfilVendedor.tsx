import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, UserCircle, Save, Key } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function PerfilVendedor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendedor, setVendedor] = useState<any>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: ""
  });
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchVendedor();
  }, []);

  async function fetchVendedor() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setVendedor(data);
        setFormData({
          nome: data.nome || "",
          telefone: data.telefone || "",
          email: session.user.email || ""
        });
      } else {
        // Para Admin sem registro na tabela vendedores
        setVendedor({ user_id: session.user.id }); 
        setFormData({
          nome: session.user.user_metadata?.nome || "Administrador",
          telefone: session.user.user_metadata?.telefone || "",
          email: session.user.email || ""
        });
      }
    } catch (err) {
      console.error("Erro ao buscar vendedor:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.warning("Por favor, selecione uma imagem válida (JPG, PNG ou WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.warning("A imagem é muito grande. O limite é de 2MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      let updateError;
      let updatedVendedor;

      if (vendedor?.id) {
        // Atualizar
        const result = await supabase
          .from('vendedores')
          .update({ avatar_url: publicUrl })
          .eq('id', vendedor.id)
          .select()
          .single();
        updateError = result.error;
        updatedVendedor = result.data;
      } else {
        // Inserir
        const result = await supabase
          .from('vendedores')
          .insert({ 
            user_id: session.user.id,
            avatar_url: publicUrl
          })
          .select()
          .single();
        updateError = result.error;
        updatedVendedor = result.data;
      }

      if (updateError) throw updateError;

      setVendedor(updatedVendedor);
      toast.success("Foto de perfil atualizada!");
      
    } catch (error: any) {
      console.error("Erro ao fazer upload do avatar:", error);
      toast.error(`Erro no upload: ${error.message || "Erro desconhecido"}`);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let error;
      let savedData;
      
      if (vendedor.id) {
        // Atualizar existente
        const result = await supabase
          .from('vendedores')
          .update({
            nome: formData.nome,
            telefone: formData.telefone
          })
          .eq('id', vendedor.id)
          .select()
          .single();
        error = result.error;
        savedData = result.data;
      } else {
        // Inserir novo
        const result = await supabase
          .from('vendedores')
          .insert({
            user_id: vendedor.user_id,
            nome: formData.nome,
            telefone: formData.telefone
          })
          .select()
          .single();
        error = result.error;
        savedData = result.data;
      }
      
      if (error) throw error;
      setVendedor(savedData);
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      toast.warning("As senhas não coincidem!");
      return;
    }
    if (passwordData.password.length < 6) {
      toast.warning("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.password
      });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setPasswordData({ password: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error("Erro ao alterar senha: " + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meu Perfil</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie suas informações de Guardião.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Banner de Referência */}
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden border-none shadow-lg shadow-indigo-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                <Key className="h-8 w-8 text-white/95" />
              </div>
              <div>
                <p className="text-blue-100/80 text-xs font-bold uppercase tracking-widest mb-1">Meu Código de Referência</p>
                <p className="text-3xl font-black tracking-tighter text-white">{vendedor?.codigo_ref || '---'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 dark:border-slate-800 shadow-md bg-card">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-slate-400 dark:text-slate-500" /> Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                >
                  <Avatar className="h-24 w-24 ring-4 ring-slate-100 dark:ring-slate-800">
                    <AvatarImage src={vendedor?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-2xl font-bold uppercase">
                      {formData.nome.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-opacity ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {uploadingAvatar ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Clique para mudar a foto</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">Nome e Sobrenome</Label>
                <Input 
                  value={formData.nome} 
                  onChange={e => setFormData({...formData, nome: e.target.value})} 
                  className="border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-blue-400"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 font-semibold">E-mail (Acesso)</Label>
                  <Input 
                    disabled 
                    value={formData.email} 
                    className="bg-slate-50 dark:bg-slate-900/50 border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400" 
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">O e-mail não pode ser alterado.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 font-semibold">WhatsApp</Label>
                  <Input 
                    value={formData.telefone} 
                    onChange={e => setFormData({...formData, telefone: e.target.value})} 
                    className="border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-blue-400"
                  />
                </div>
              </div>

              <hr className="my-6 border-slate-100 dark:border-slate-800" />

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Segurança / Troca de Senha */}
        <Card className="border border-slate-100 dark:border-slate-800 shadow-md bg-card">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Key className="h-5 w-5 text-slate-400 dark:text-slate-500" /> Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 font-semibold">Nova Senha</Label>
                  <Input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres"
                    value={passwordData.password}
                    onChange={e => setPasswordData({...passwordData, password: e.target.value})}
                    className="border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 font-semibold">Confirmar Nova Senha</Label>
                  <Input 
                    type="password" 
                    placeholder="Repita a nova senha"
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={changingPassword || !passwordData.password} 
                  variant="outline" 
                  className="border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  {changingPassword ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                  Atualizar Senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
