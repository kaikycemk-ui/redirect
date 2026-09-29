'use client';

import React, { useState } from 'react';
import { Compass, Plus, Edit2, Copy, Trash2, CheckCircle2, XCircle, Search, Calendar } from 'lucide-react';
import { saveCampaign, duplicateCampaign, toggleCampaignActive, deleteCampaign } from '@/lib/actions/campaigns';
import { formatDateTime } from '@/lib/utils';

interface Source {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  slug: string;
  source_id: string | null;
  description: string | null;
  active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  source?: { id: string; name: string } | null;
}

export function CampaignsClient({
  initialCampaigns,
  sources,
}: {
  initialCampaigns: Campaign[];
  sources: Source[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSourceId, setFormSourceId] = useState<string>('');
  const [formDesc, setFormDesc] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formActive, setFormActive] = useState(true);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormName('');
    setFormSlug('');
    setFormSourceId(sources[0]?.id || '');
    setFormDesc('');
    setFormStart('');
    setFormEnd('');
    setFormActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Campaign) => {
    setEditingCampaign(c);
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormSourceId(c.source_id || '');
    setFormDesc(c.description || '');
    setFormStart(c.start_at ? c.start_at.substring(0, 16) : '');
    setFormEnd(c.end_at ? c.end_at.substring(0, 16) : '');
    setFormActive(c.active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCampaign) {
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
      await saveCampaign({
        id: editingCampaign?.id,
        name: formName,
        slug: formSlug,
        source_id: formSourceId || null,
        description: formDesc,
        start_at: formStart ? new Date(formStart).toISOString() : null,
        end_at: formEnd ? new Date(formEnd).toISOString() : null,
        active: formActive,
      });

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar campanha.');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateCampaign(id);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar.');
    }
  };

  const handleToggle = async (c: Campaign) => {
    try {
      await toggleCampaignActive(c.id, c.active);
      setCampaigns(campaigns.map((item) => (item.id === c.id ? { ...item, active: !item.active } : item)));
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta campanha?')) return;
    try {
      await deleteCampaign(id);
      setCampaigns(campaigns.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
    }
  };

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-blue-500" />
            <span>Campanhas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize seus links em campanhas com controle de vigência e vinculação por fonte
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Campanha</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-[#0f172a]/70 p-3 rounded-xl border border-slate-800">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar campanha por nome ou slug..."
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
                <th className="py-3 px-4">Campanha</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Fonte Associada</th>
                <th className="py-3 px-4">Vigência</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhuma campanha cadastrada.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{c.name}</td>
                    <td className="py-3.5 px-4 font-mono text-blue-400">{c.slug}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.source?.name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {c.source.name}
                        </span>
                      ) : (
                        <span className="text-slate-500">Geral</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {c.start_at || c.end_at ? (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {c.start_at ? new Date(c.start_at).toLocaleDateString('pt-BR') : 'Início'}
                            {' → '}
                            {c.end_at ? new Date(c.end_at).toLocaleDateString('pt-BR') : 'Sem fim'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Sempre Ativa</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(c)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                          c.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {c.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Ativa</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Pausada</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleDuplicate(c.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                        title="Duplicar Campanha"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white">
              {editingCampaign ? 'Editar Campanha' : 'Cadastrar Nova Campanha'}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Campanha</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campanha Modelo 01 - Verão"
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
                  placeholder="modelo-01-verao"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fonte Principal</label>
                <select
                  value={formSourceId}
                  onChange={(e) => setFormSourceId(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Nenhuma / Geral</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data Início</label>
                  <input
                    type="datetime-local"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data Término</label>
                  <input
                    type="datetime-local"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="campActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-slate-700 bg-[#162032] text-blue-600 focus:ring-0"
                />
                <label htmlFor="campActive" className="text-xs text-slate-300 cursor-pointer">
                  Campanha ativa
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
                  {loading ? 'Salvando...' : 'Salvar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
