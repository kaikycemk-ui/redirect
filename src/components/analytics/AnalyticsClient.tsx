'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Filter,
  Users,
  MousePointerClick,
  Layers,
  Compass,
  Link as LinkIcon,
  Smartphone,
  Send,
  Calendar,
} from 'lucide-react';
import { getAnalyticsData, AnalyticsFilter } from '@/lib/actions/analytics';

interface AnalyticsClientProps {
  initialData: any;
  sources: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; name: string }>;
  links: Array<{ id: string; name: string; slug: string }>;
  devices: Array<{ id: string; name: string; code: string }>;
}

export function AnalyticsClient({
  initialData,
  sources,
  campaigns,
  links,
  devices,
}: AnalyticsClientProps) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  // Filters
  const [period, setPeriod] = useState<AnalyticsFilter['period']>('7d');
  const [sourceId, setSourceId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [linkId, setLinkId] = useState('');
  const [deviceId, setDeviceId] = useState('');

  const applyFilters = async () => {
    setLoading(true);
    try {
      const res = await getAnalyticsData({
        period,
        sourceId: sourceId || undefined,
        campaignId: campaignId || undefined,
        linkId: linkId || undefined,
        deviceId: deviceId || undefined,
      });
      setData(res);
    } catch (err) {
      alert('Erro ao carregar dados filtrados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          <span>Relatórios & Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Métricas de conversão, cliques e distribuição por fonte, campanha, link e dispositivo
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0f172a]/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filtros Operacionais</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Período */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full bg-[#162032] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="all">Todo o período</option>
            </select>
          </div>

          {/* Fonte */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Fonte</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-[#162032] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Todas</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campanha */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Campanha</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full bg-[#162032] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Todas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Link */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Link</label>
            <select
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              className="w-full bg-[#162032] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Todos</option>
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Aplicar */}
          <div className="flex items-end">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Filtrando...' : 'Aplicar Filtros'}
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cliques Totais no Filtro</span>
            <MousePointerClick className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white mt-1">{data.totalClicks}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Visitantes Únicos Estimados</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white mt-1">{data.uniqueVisitors}</div>
        </div>
      </div>

      {/* Tables Ranking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fontes */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> Distribuição por Fonte
            </h3>
          </div>
          <div className="space-y-2">
            {data.bySource.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">Nenhum dado.</p>
            ) : (
              data.bySource.map((s: any) => (
                <div key={s.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span className="font-bold text-slate-300">
                      {s.count} ({s.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${s.percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Campanhas */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" /> Distribuição por Campanha
            </h3>
          </div>
          <div className="space-y-2">
            {data.byCampaign.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">Nenhum dado.</p>
            ) : (
              data.byCampaign.map((c: any) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="font-bold text-slate-300">
                      {c.count} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Links */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-emerald-400" /> Distribuição por Link
            </h3>
          </div>
          <div className="space-y-2">
            {data.byLink.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">Nenhum dado.</p>
            ) : (
              data.byLink.map((l: any) => (
                <div key={l.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[220px]">{l.name}</span>
                    <span className="font-bold text-slate-300">
                      {l.count} ({l.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${l.percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Aparelhos / Dispositivos */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" /> Distribuição por Aparelho
            </h3>
          </div>
          <div className="space-y-2">
            {data.byDevice.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">Nenhum dado.</p>
            ) : (
              data.byDevice.map((d: any) => (
                <div key={d.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white">{d.name}</span>
                    <span className="font-bold text-slate-300">
                      {d.count} ({d.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${d.percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
