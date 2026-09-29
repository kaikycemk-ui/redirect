'use client';

import React, { useState } from 'react';
import QRCode from 'qrcode';
import {
  Link as LinkIcon,
  Plus,
  Edit2,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  QrCode as QrIcon,
  PlayCircle,
  Download,
  Check,
  Smartphone,
  Layers,
  Compass,
  Shuffle,
  BarChart2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  saveLink,
  duplicateLink,
  toggleLinkActive,
  deleteLink,
} from '@/lib/actions/links';
import { formatRelativeTime } from '@/lib/utils';
import { simulateDistribution } from '@/lib/engine/strategies';

interface Source {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  code: string;
  active: boolean;
  maintenance: boolean;
}

interface LinkItem {
  id: string;
  name: string;
  slug: string;
  source_id: string | null;
  campaign_id: string | null;
  strategy: 'round_robin' | 'random' | 'weighted';
  destination_strategy: 'round_robin' | 'random' | 'weighted';
  fallback_url: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  last_activity: string | null;
  total_clicks: number;
  source?: { id: string; name: string } | null;
  campaign?: { id: string; name: string } | null;
  link_devices?: Array<{
    id: string;
    weight: number;
    device: { id: string; name: string; code: string; active: boolean; maintenance: boolean };
  }>;
}

export function LinksClient({
  initialLinks,
  sources,
  campaigns,
  devices,
  appUrl,
}: {
  initialLinks: LinkItem[];
  sources: Source[];
  campaigns: Campaign[];
  devices: Device[];
  appUrl: string;
}) {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal QR Code
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [currentQrSlug, setCurrentQrSlug] = useState('');

  // Modal Simulador de Distribuição
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [selectedLinkForSim, setSelectedLinkForSim] = useState<LinkItem | null>(null);
  const [simVisits, setSimVisits] = useState(1000);
  const [simResults, setSimResults] = useState<Record<string, { count: number; percentage: number }> | null>(null);

  // Modal Teste de Link
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSourceId, setFormSourceId] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('');
  const [formStrategy, setFormStrategy] = useState<'round_robin' | 'random' | 'weighted'>('round_robin');
  const [formDestStrategy, setFormDestStrategy] = useState<'round_robin' | 'random' | 'weighted'>('round_robin');
  const [formFallback, setFormFallback] = useState('');
  const [formExpires, setFormExpires] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Array<{ device_id: string; weight: number }>>([]);

  const openCreateModal = () => {
    setEditingLink(null);
    setFormName('');
    setFormSlug('');
    setFormSourceId(sources[0]?.id || '');
    setFormCampaignId(campaigns[0]?.id || '');
    setFormStrategy('round_robin');
    setFormDestStrategy('round_robin');
    setFormFallback('');
    setFormExpires('');
    setFormActive(true);
    setSelectedDevices(
      devices.slice(0, 2).map((d) => ({ device_id: d.id, weight: 50 }))
    );
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (l: LinkItem) => {
    setEditingLink(l);
    setFormName(l.name);
    setFormSlug(l.slug);
    setFormSourceId(l.source_id || '');
    setFormCampaignId(l.campaign_id || '');
    setFormStrategy(l.strategy);
    setFormDestStrategy(l.destination_strategy || 'round_robin');
    setFormFallback(l.fallback_url || '');
    setFormExpires(l.expires_at ? l.expires_at.substring(0, 16) : '');
    setFormActive(l.active);
    setSelectedDevices(
      (l.link_devices || []).map((ld) => ({
        device_id: ld.device?.id,
        weight: ld.weight,
      })).filter((item) => Boolean(item.device_id))
    );
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingLink) {
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

  const handleDeviceToggle = (deviceId: string) => {
    const exists = selectedDevices.find((d) => d.device_id === deviceId);
    if (exists) {
      setSelectedDevices(selectedDevices.filter((d) => d.device_id !== deviceId));
    } else {
      setSelectedDevices([...selectedDevices, { device_id: deviceId, weight: 50 }]);
    }
  };

  const handleWeightChange = (deviceId: string, weight: number) => {
    setSelectedDevices(
      selectedDevices.map((d) => (d.device_id === deviceId ? { ...d, weight: Math.max(0, weight) } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await saveLink({
        id: editingLink?.id,
        name: formName,
        slug: formSlug,
        source_id: formSourceId || null,
        campaign_id: formCampaignId || null,
        strategy: formStrategy,
        destination_strategy: formDestStrategy,
        fallback_url: formFallback || null,
        expires_at: formExpires ? new Date(formExpires).toISOString() : null,
        active: formActive,
        devices: selectedDevices,
      });

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar link.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (slug: string) => {
    const fullUrl = `${appUrl.replace(/\/$/, '')}/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleGenerateQr = async (slug: string) => {
    const fullUrl = `${appUrl.replace(/\/$/, '')}/${slug}`;
    try {
      const dataUri = await QRCode.toDataURL(fullUrl, { width: 350, margin: 2 });
      setCurrentQrUrl(dataUri);
      setCurrentQrSlug(slug);
      setQrModalOpen(true);
    } catch (err) {
      alert('Erro ao gerar QR Code.');
    }
  };

  const handleOpenSim = (l: LinkItem) => {
    setSelectedLinkForSim(l);
    setSimVisits(1000);
    // Simular inicial
    runSimulation(l, 1000);
    setSimModalOpen(true);
  };

  const runSimulation = (link: LinkItem, count: number) => {
    const items = (link.link_devices || []).map((ld) => ({
      id: ld.device?.id,
      name: `${ld.device?.code} (${ld.device?.name})`,
      weight: ld.weight,
    })).filter((x) => Boolean(x.id));

    const results = simulateDistribution(items as any, link.strategy, count);
    setSimResults(results);
  };

  const handleTestLink = async (slug: string) => {
    setTestLoading(true);
    setTestModalOpen(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/test-route?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Falha ao testar rota' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateLink(id);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar link.');
    }
  };

  const handleToggle = async (l: LinkItem) => {
    try {
      await toggleLinkActive(l.id, l.active);
      setLinks(links.map((item) => (item.id === l.id ? { ...item, active: !item.active } : item)));
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este link? O histórico de cliques não será apagado.')) return;
    try {
      await deleteLink(id);
      setLinks(links.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir link.');
    }
  };

  const filteredLinks = links.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.source?.name && l.source.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.campaign?.name && l.campaign.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <LinkIcon className="w-6 h-6 text-blue-500" />
            <span>Links de Redirecionamento</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Motor de redirecionamento FONTE → CAMPANHA → LINK → DISPOSITIVO → DESTINO
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Link</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-[#0f172a]/70 p-3 rounded-xl border border-slate-800">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar link por nome, slug, fonte ou campanha..."
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
                <th className="py-3 px-4">Link / Nome</th>
                <th className="py-3 px-4">URL Pública</th>
                <th className="py-3 px-4">Fonte / Campanha</th>
                <th className="py-3 px-4">Aparelhos Conectados</th>
                <th className="py-3 px-4">Estratégia</th>
                <th className="py-3 px-4">Cliques</th>
                <th className="py-3 px-4">Última Atividade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Nenhum link de redirecionamento cadastrado.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((l) => {
                  const devCount = (l.link_devices || []).length;
                  const isExpired = l.expires_at && new Date(l.expires_at) < new Date();

                  return (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{l.name}</div>
                        <div className="text-[11px] text-slate-500">{devCount} aparelhos na rota</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-blue-400 font-medium">
                          <span>/{l.slug}</span>
                          <button
                            onClick={() => handleCopyLink(l.slug)}
                            className="p-1 hover:text-white rounded"
                            title="Copiar link completo"
                          >
                            {copiedSlug === l.slug ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="space-y-0.5">
                          {l.source && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] mr-1">
                              {l.source.name}
                            </span>
                          )}
                          {l.campaign && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                              {l.campaign.name}
                            </span>
                          )}
                          {!l.source && !l.campaign && <span className="text-slate-500">-</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(l.link_devices || []).map((ld, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {ld.device?.code} ({ld.weight}%)
                            </span>
                          ))}
                          {devCount === 0 && (
                            <span className="text-amber-400 font-semibold text-[11px]">Nenhum</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-400 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Shuffle className="w-3 h-3 text-slate-500" />
                          <span>{l.strategy}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">{l.total_clicks}</td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatRelativeTime(l.last_activity)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            Expirado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggle(l)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                              l.active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {l.active ? (
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
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleTestLink(l.slug)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Testar Link (Sem computar clique)"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleGenerateQr(l.slug)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Gerar QR Code PNG"
                        >
                          <QrIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenSim(l)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Simular Distribuição"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(l.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Duplicar Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(l)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Link */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 my-8">
            <h3 className="text-base font-bold text-white">
              {editingLink ? 'Editar Link de Redirecionamento' : 'Criar Novo Link'}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Link</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TikTok Modelo 01"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Slug da URL (/...)</label>
                  <input
                    type="text"
                    required
                    placeholder="tiktok-modelo01"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fonte de Tráfego</label>
                  <select
                    value={formSourceId}
                    onChange={(e) => setFormSourceId(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Sem Fonte / Geral</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Campanha</label>
                  <select
                    value={formCampaignId}
                    onChange={(e) => setFormCampaignId(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Sem Campanha / Geral</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estratégias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#131b2e]/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estratégia de Dispositivo
                  </label>
                  <select
                    value={formStrategy}
                    onChange={(e) => setFormStrategy(e.target.value as any)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="weighted">Weighted (Ponderada por Peso)</option>
                    <option value="round_robin">Round Robin (Sequencial)</option>
                    <option value="random">Random (Aleatória)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estratégia de Destino
                  </label>
                  <select
                    value={formDestStrategy}
                    onChange={(e) => setFormDestStrategy(e.target.value as any)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="weighted">Weighted (Ponderada por Peso)</option>
                    <option value="round_robin">Round Robin (Sequencial)</option>
                    <option value="random">Random (Aleatória)</option>
                  </select>
                </div>
              </div>

              {/* Seleção de Aparelhos e Pesos */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Aparelhos Vinculados e Pesos de Distribuição
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded-xl bg-[#131b2e]/40 border border-slate-800">
                  {devices.length === 0 ? (
                    <p className="text-xs text-slate-500 p-2">Nenhum aparelho cadastrado.</p>
                  ) : (
                    devices.map((dev) => {
                      const selected = selectedDevices.find((d) => d.device_id === dev.id);
                      return (
                        <div
                          key={dev.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(selected)}
                              onChange={() => handleDeviceToggle(dev.id)}
                              className="rounded border-slate-700 bg-[#162032] text-blue-600 focus:ring-0"
                            />
                            <div>
                              <span className="font-mono text-[11px] font-bold text-blue-400 mr-1.5">
                                {dev.code}
                              </span>
                              <span className="text-xs text-slate-200">{dev.name}</span>
                              {dev.maintenance && (
                                <span className="ml-2 text-[10px] text-amber-400 font-semibold">
                                  (Manutenção)
                                </span>
                              )}
                            </div>
                          </div>

                          {selected && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-400 text-[11px]">Peso:</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={selected.weight}
                                onChange={(e) => handleWeightChange(dev.id, Number(e.target.value))}
                                className="w-16 bg-[#162032] border border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-white"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Fallback & Expiração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL de Fallback Específica
                  </label>
                  <input
                    type="url"
                    placeholder="https://meusite.com/backup"
                    value={formFallback}
                    onChange={(e) => setFormFallback(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expira em</label>
                  <input
                    type="datetime-local"
                    value={formExpires}
                    onChange={(e) => setFormExpires(e.target.value)}
                    className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="linkActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-slate-700 bg-[#162032] text-blue-600 focus:ring-0"
                />
                <label htmlFor="linkActive" className="text-xs text-slate-300 cursor-pointer">
                  Link ativo para redirecionamento público
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
                  {loading ? 'Salvando...' : 'Salvar Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-white">QR Code do Link</h3>
            <p className="text-xs font-mono text-blue-400">/{currentQrSlug}</p>

            <div className="bg-white p-4 rounded-xl inline-block shadow-md">
              {currentQrUrl && (
                <img src={currentQrUrl} alt="QR Code" className="w-56 h-56 mx-auto" />
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <a
                href={currentQrUrl}
                download={`leadrouter-qr-${currentQrSlug}.png`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PNG</span>
              </a>
              <button
                onClick={() => setQrModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Simulador de Distribuição */}
      {simModalOpen && selectedLinkForSim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Simulador de Distribuição de Tráfego</h3>
                <p className="text-xs text-slate-400">
                  Link: <span className="font-semibold text-white">{selectedLinkForSim.name}</span> ({selectedLinkForSim.strategy})
                </p>
              </div>
              <button
                onClick={() => setSimModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-300">Volume de Acessos:</label>
              <input
                type="number"
                min="10"
                max="100000"
                step="100"
                value={simVisits}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimVisits(val);
                  runSimulation(selectedLinkForSim, val);
                }}
                className="w-28 bg-[#162032] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button
                onClick={() => runSimulation(selectedLinkForSim, simVisits)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white"
              >
                Recalcular
              </button>
            </div>

            {/* Results */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase text-slate-400">
                Resultado Projetado ({simVisits} cliques):
              </h4>
              <div className="space-y-2">
                {(selectedLinkForSim.link_devices || []).map((ld) => {
                  const dev = ld.device;
                  const res = simResults?.[dev.id] || { count: 0, percentage: 0 };

                  return (
                    <div
                      key={dev.id}
                      className="p-3 rounded-xl bg-[#131b2e]/60 border border-slate-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-400 font-bold">{dev.code}</span>
                          <span className="text-white font-medium">{dev.name}</span>
                          <span className="text-[10px] text-slate-500">(Config: {ld.weight}%)</span>
                        </div>
                        <div className="font-bold text-white text-xs">
                          {res.count} cliques ({res.percentage}%)
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${res.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSimModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Teste de Link em Tempo Real */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-emerald-400" />
              <span>Diagnóstico e Teste de Rota</span>
            </h3>

            {testLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Simulando requisição e resolvendo tráfego...
              </div>
            ) : testResult ? (
              <div className="space-y-3 text-xs">
                <div
                  className={`p-3 rounded-xl border ${
                    testResult.isFallback
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  <span className="font-bold block">
                    {testResult.isFallback ? 'Aviso: Redirecionado para Fallback' : 'Sucesso: Destino Resolvido!'}
                  </span>
                  {testResult.fallbackReason && (
                    <span className="text-[11px] opacity-80">{testResult.fallbackReason}</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#131b2e] border border-slate-800 space-y-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">URL Final Resolvida:</span>
                    <a
                      href={testResult.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-400 underline break-all"
                    >
                      {testResult.redirectUrl}
                    </a>
                  </div>

                  {testResult.details && (
                    <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Aparelho Selecionado:</span>
                        <span className="text-white font-semibold">
                          {testResult.details.deviceName || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Destino Selecionado:</span>
                        <span className="text-white font-semibold">
                          {testResult.details.destinationName || '-'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  * Este teste não gerou nenhum registro de clique no banco de dados.
                </p>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
