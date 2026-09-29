'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Wrench,
  Search,
  Send,
  Link as LinkIcon,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { saveDevice, toggleDeviceMaintenance, toggleDeviceActive, deleteDevice } from '@/lib/actions/devices';
import { formatRelativeTime } from '@/lib/utils';

interface Device {
  id: string;
  name: string;
  code: string;
  model: string | null;
  description: string | null;
  active: boolean;
  maintenance: boolean;
  created_at: string;
  last_activity: string | null;
  total_clicks: number;
  destinations?: Array<{ id: string; name: string; type: string; active: boolean }>;
  link_devices?: Array<{ id: string; link: { id: string; name: string; slug: string } }>;
}

export function DevicesClient({ initialDevices }: { initialDevices: Device[] }) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formMaintenance, setFormMaintenance] = useState(false);

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormName('');
    setFormCode(`DEV-${String(devices.length + 1).padStart(3, '0')}`);
    setFormModel('');
    setFormDesc('');
    setFormActive(true);
    setFormMaintenance(false);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (d: Device) => {
    setEditingDevice(d);
    setFormName(d.name);
    setFormCode(d.code);
    setFormModel(d.model || '');
    setFormDesc(d.description || '');
    setFormActive(d.active);
    setFormMaintenance(d.maintenance);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await saveDevice({
        id: editingDevice?.id,
        name: formName,
        code: formCode,
        model: formModel,
        description: formDesc,
        active: formActive,
        maintenance: formMaintenance,
      });

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar aparelho.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async (d: Device) => {
    try {
      await toggleDeviceMaintenance(d.id, d.maintenance);
      setDevices(
        devices.map((item) => (item.id === d.id ? { ...item, maintenance: !item.maintenance } : item))
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar manutenção.');
    }
  };

  const handleToggleActive = async (d: Device) => {
    try {
      await toggleDeviceActive(d.id, d.active);
      setDevices(devices.map((item) => (item.id === d.id ? { ...item, active: !item.active } : item)));
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este aparelho? Todos os destinos vinculados também serão removidos.')) return;
    try {
      await deleteDevice(id);
      setDevices(devices.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
    }
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.model && d.model.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Smartphone className="w-6 h-6 text-blue-500" />
            <span>Aparelhos / Celulares</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Controle de celulares físicos da operação, status operacional e alternância de manutenção
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Celular</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-[#0f172a]/70 p-3 rounded-xl border border-slate-800">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por código (DEV-001), nome ou modelo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-[#0f172a]/50 rounded-2xl border border-slate-800">
            Nenhum aparelho encontrado.
          </div>
        ) : (
          filteredDevices.map((d) => {
            const isExpanded = expandedDeviceId === d.id;
            const dests = d.destinations || [];
            const links = d.link_devices || [];

            return (
              <div
                key={d.id}
                className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top card info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {d.code}
                        </span>
                        {d.maintenance && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Wrench className="w-3 h-3" /> Manutenção
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">{d.name}</h3>
                      <p className="text-xs text-slate-400">{d.model || 'Modelo não especificado'}</p>
                    </div>

                    <div className="flex items-center gap-1">
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
                    </div>
                  </div>

                  {/* Metrics snapshot */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-[#131b2e]/60 border border-slate-800/60 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Leads / Cliques</span>
                      <span className="font-bold text-white text-sm">{d.total_clicks}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Último Acesso</span>
                      <span className="font-medium text-slate-300 text-xs">
                        {formatRelativeTime(d.last_activity)}
                      </span>
                    </div>
                  </div>

                  {/* Summary of links and destinations */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Send className="w-3 h-3 text-slate-500" /> Destinos vinculados:
                      </span>
                      <span className="font-bold text-white">{dests.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3 text-slate-500" /> Links associados:
                      </span>
                      <span className="font-bold text-white">{links.length}</span>
                    </div>
                  </div>

                  {/* Accordion detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-400 text-[11px] block mb-1">
                          Destinos no Aparelho:
                        </span>
                        {dests.length === 0 ? (
                          <span className="text-amber-400 text-[11px]">Sem destinos ativos!</span>
                        ) : (
                          <div className="space-y-1">
                            {dests.map((dest) => (
                              <div
                                key={dest.id}
                                className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-[11px]"
                              >
                                <span className="text-slate-300 truncate">{dest.name}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded ${
                                    dest.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
                                  }`}
                                >
                                  {dest.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(d)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        d.active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {d.active ? 'Ativo' : 'Inativo'}
                    </button>

                    <button
                      onClick={() => handleToggleMaintenance(d)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        d.maintenance
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {d.maintenance ? 'Em Manutenção' : 'Manutenção'}
                    </button>
                  </div>

                  <button
                    onClick={() => setExpandedDeviceId(isExpanded ? null : d.id)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white">
              {editingDevice ? 'Editar Aparelho' : 'Cadastrar Novo Aparelho'}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Identificador / Código</label>
                <input
                  type="text"
                  required
                  placeholder="DEV-001"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Dispositivo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Celular Atendimento 01"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo do Aparelho</label>
                <input
                  type="text"
                  placeholder="Ex: Samsung S23 / iPhone 14"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição / Operador</label>
                <textarea
                  rows={2}
                  placeholder="Aparelho alocado com a operadora Maria..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="devActive"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded border-slate-700 bg-[#162032] text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="devActive" className="text-xs text-slate-300 cursor-pointer">
                    Aparelho ativo no sistema
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="devMaint"
                    checked={formMaintenance}
                    onChange={(e) => setFormMaintenance(e.target.checked)}
                    className="rounded border-slate-700 bg-[#162032] text-amber-500 focus:ring-0"
                  />
                  <label htmlFor="devMaint" className="text-xs text-amber-300 cursor-pointer">
                    Colocar em Modo Manutenção (Não recebe tráfego)
                  </label>
                </div>
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
                  {loading ? 'Salvando...' : 'Salvar Aparelho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
