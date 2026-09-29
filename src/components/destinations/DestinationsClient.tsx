'use client';

import React, { useState } from 'react';
import {
  Send,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  MessageCircle,
  Globe,
  Sliders,
} from 'lucide-react';
import { saveDestination, toggleDestinationActive, deleteDestination } from '@/lib/actions/destinations';
import { formatRelativeTime } from '@/lib/utils';

interface Device {
  id: string;
  name: string;
  code: string;
}

interface Destination {
  id: string;
  device_id: string;
  name: string;
  type: 'whatsapp' | 'telegram' | 'website' | 'other';
  url: string;
  phone_number: string | null;
  weight: number;
  active: boolean;
  created_at: string;
  last_activity: string | null;
  total_clicks: number;
  device?: { id: string; name: string; code: string } | null;
}

export function DestinationsClient({
  initialDestinations,
  devices,
}: {
  initialDestinations: Destination[];
  devices: Device[];
}) {
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'whatsapp' | 'telegram' | 'website' | 'other'>('whatsapp');
  const [formUrl, setFormUrl] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWeight, setFormWeight] = useState(50);
  const [formActive, setFormActive] = useState(true);

  const openCreateModal = () => {
    setEditingDest(null);
    setFormDeviceId(devices[0]?.id || '');
    setFormName('');
    setFormType('whatsapp');
    setFormUrl('');
    setFormPhone('');
    setFormWeight(50);
    setFormActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (d: Destination) => {
    setEditingDest(d);
    setFormDeviceId(d.device_id);
    setFormName(d.name);
    setFormType(d.type);
    setFormUrl(d.url);
    setFormPhone(d.phone_number || '');
    setFormWeight(d.weight);
    setFormActive(d.active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeviceId) {
      setErrorMsg('Selecione um aparelho físico para vincular este destino.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await saveDestination({
        id: editingDest?.id,
        device_id: formDeviceId,
        name: formName,
        type: formType,
        url: formUrl || '#',
        phone_number: formPhone,
        weight: Number(formWeight),
        active: formActive,
      });

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar destino.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (d: Destination) => {
    try {
      await toggleDestinationActive(d.id, d.active);
      setDestinations(
        destinations.map((item) => (item.id === d.id ? { ...item, active: !item.active } : item))
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este destino?')) return;
    try {
      await deleteDestination(id);
      setDestinations(destinations.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
    }
  };

  const filteredDestinations = destinations.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.phone_number && d.phone_number.includes(searchTerm)) ||
      (d.device?.name && d.device.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.device?.code && d.device.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Send className="w-6 h-6 text-blue-500" />
            <span>Destinos (WhatsApp / URLs)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre os números de WhatsApp ou URLs de destino finais alocados em cada celular
          </p>
        </div>

        <button
          onClick={openCreateModal}
          disabled={devices.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Destino</span>
        </button>
      </div>

      {devices.length === 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          Nenhum celular cadastrado no sistema. Cadastre primeiro um aparelho na aba &quot;Dispositivos&quot; para poder vincular destinos.
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-[#0f172a]/70 p-3 rounded-xl border border-slate-800">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nome, número de telefone ou aparelho..."
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
                <th className="py-3 px-4">Destino</th>
                <th className="py-3 px-4">Aparelho Físico</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Peso (Weighted)</th>
                <th className="py-3 px-4">Leads / Cliques</th>
                <th className="py-3 px-4">Última Atividade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDestinations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhum destino cadastrado.
                  </td>
                </tr>
              ) : (
                filteredDestinations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{d.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {d.phone_number || d.url}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {d.device ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 font-bold border border-slate-700">
                            {d.device.code}
                          </span>
                          <span className="text-slate-300">{d.device.name}</span>
                        </div>
                      ) : (
                        <span className="text-red-400">Sem aparelho</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">
                        {d.type === 'whatsapp' ? <MessageCircle className="w-3 h-3 text-emerald-400" /> : <Globe className="w-3 h-3 text-blue-400" />}
                        <span>{d.type}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        Peso {d.weight}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{d.total_clicks}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {formatRelativeTime(d.last_activity)}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(d)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                          d.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {d.active ? (
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
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {d.url && d.url !== '#' && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Testar URL de destino"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => openEditModal(d)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
              {editingDest ? 'Editar Destino' : 'Cadastrar Novo Destino'}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Aparelho Físico (Device)</label>
                <select
                  required
                  value={formDeviceId}
                  onChange={(e) => setFormDeviceId(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione o aparelho...</option>
                  {devices.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.code} - {dev.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Destino</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: WhatsApp 01 - Atendente Carlos"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="website">Website / URL</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Peso (Weight)</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    required
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {formType === 'whatsapp' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Número do WhatsApp com DDI e DDD</label>
                  <input
                    type="text"
                    placeholder="+5511999999999"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL Final de Redirecionamento
                </label>
                <input
                  type="url"
                  placeholder="https://wa.me/5511999999999 ou https://site.com"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Se for WhatsApp e você preencher o número acima, a URL é gerada automaticamente.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="destActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-slate-700 bg-[#162032] text-blue-600 focus:ring-0"
                />
                <label htmlFor="destActive" className="text-xs text-slate-300 cursor-pointer">
                  Destino ativo para receber leads
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
                  {loading ? 'Salvando...' : 'Salvar Destino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
