'use client';

import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { saveSource, toggleSourceActive, deleteSource } from '@/lib/actions/sources';
import { formatDateTime } from '@/lib/utils';

interface Source {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function SourcesClient({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);

  const openCreateModal = () => {
    setEditingSource(null);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Source) => {
    setEditingSource(s);
    setFormName(s.name);
    setFormSlug(s.slug);
    setFormDesc(s.description || '');
    setFormActive(s.active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingSource) {
      // Auto-gerar slug amigável
      setFormSlug(
        val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await saveSource({
        id: editingSource?.id,
        name: formName,
        slug: formSlug,
        description: formDesc,
        active: formActive,
      });

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar fonte.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (s: Source) => {
    try {
      await toggleSourceActive(s.id, s.active);
      setSources(sources.map((item) => (item.id === s.id ? { ...item, active: !item.active } : item)));
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta fonte?')) return;
    try {
      await deleteSource(id);
      setSources(sources.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir fonte.');
    }
  };

  const filteredSources = sources.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-500" />
            <span>Fontes de Tráfego</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre as origens do seu tráfego (Instagram, TikTok, Facebook, YouTube, etc.)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Fonte</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-[#0f172a]/70 p-3 rounded-xl border border-slate-800">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar fonte por nome ou slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0f172a]/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131b2e] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">Slug Identificador</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Criado em</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhuma fonte de tráfego cadastrada.
                  </td>
                </tr>
              ) : (
                filteredSources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{s.name}</td>
                    <td className="py-3.5 px-4 font-mono text-blue-400">{s.slug}</td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{s.description || '-'}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(s)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                          s.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {s.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inativo</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{formatDateTime(s.created_at)}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white">
              {editingSource ? 'Editar Fonte de Tráfego' : 'Cadastrar Nova Fonte'}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Fonte</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TikTok Ads"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Slug</label>
                <input
                  type="text"
                  required
                  placeholder="tiktok-ads"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Campanhas de tráfego pago no TikTok..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-slate-700 bg-[#162032] text-blue-600 focus:ring-0"
                />
                <label htmlFor="active" className="text-xs text-slate-300 cursor-pointer">
                  Fonte ativa para redirecionamento
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Salvar Fonte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
