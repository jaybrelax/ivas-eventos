import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from './layouts/AdminLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/admin/Dashboard';
import EventosList from './pages/admin/EventosList';
import EventoForm from './pages/admin/EventoForm';
import VendedoresList from './pages/admin/VendedoresList';
import Configuracoes from './pages/admin/Configuracoes';
import Login from './pages/admin/Login';
import VendasList from './pages/admin/PedidosList';
import PerfilVendedor from './pages/admin/PerfilVendedor';
import Recrutamento from './pages/admin/Recrutamento';
import RankingList from './pages/admin/RankingList';
import NovaSenha from './pages/admin/NovaSenha';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos de cache
    },
  },
});

export default function App() {
  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data } = await supabase.from('configuracoes').select('nome_sistema').eq('id', 1).single();
        if (data && data.nome_sistema) {
          document.title = data.nome_sistema;
        }
      } catch (error) {
        console.error('Erro ao buscar titulo:', error);
      }
    }
    fetchConfig();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<Login />} />
          <Route path="/recrutamento" element={<Recrutamento />} />
          <Route path="/nova-senha" element={<NovaSenha />} />
          
          {/* Admin Protected Routes */}
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="eventos" element={<EventosList />} />
            <Route path="eventos/novo" element={<EventoForm />} />
            <Route path="eventos/:id/editar" element={<EventoForm />} />
            <Route path="vendas" element={<VendasList />} />
            <Route path="vendedores" element={<VendedoresList />} />
            <Route path="ranking" element={<RankingList />} />
            <Route path="perfil" element={<PerfilVendedor />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
          
          {/* Fallback to Admin Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
