import React from 'react';
import Link from 'next/link';
import { getDashboardData } from '@/lib/actions/dashboard';
import { ClicksChart } from '@/components/dashboard/ClicksChart';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Smartphone,
  Send,
  Link as LinkIcon,
  Layers,
  ArrowUpRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const revalidate = 0; // Sempre atualizado em tempo real

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Centro de Comando</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Operação Online
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento em tempo real do fluxo FONTE → CAMPANHA → LINK → DISPOSITIVO → DESTINO
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/links"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Gerenciar Links</span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. SEÇÃO DE ATENÇÃO / ALERTAS OPERACIONAIS (PRIORIDADE MÁXIMA)  */}
      {/* ============================================================== */}
      {data.alerts.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Atenção Operacional ({data.alerts.length} Problemas Detectados)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3.5 backdrop-blur-sm ${
                  alert.type === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <ShieldAlert
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    alert.type === 'error' ? 'text-red-400' : 'text-amber-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold leading-tight">{alert.title}</h4>
                  <p className="text-xs opacity-80 mt-1">{alert.description}</p>
                  {alert.actionUrl && (
                    <Link
                      href={alert.actionUrl}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2.5 underline underline-offset-2 hover:opacity-100 opacity-90"
                    >
                      <span>Resolver agora</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">
              Todos os links, dispositivos e destinos estão operando em perfeito estado.
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/80 font-mono">0 Erros</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. VISÃO GERAL / METRIC CARDS                                  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cliques Hoje */}
        <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Cliques Hoje</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{data.clicksToday}</div>
          <div className="mt-1 text-[11px] text-slate-500">Últimas 24 horas</div>
        </div>

        {/* 7 Dias */}
        <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Últimos 7 Dias</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{data.clicks7d}</div>
          <div className="mt-1 text-[11px] text-slate-500">Total acumulado da semana</div>
        </div>

        {/* 30 Dias */}
        <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Últimos 30 Dias</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{data.clicks30d}</div>
          <div className="mt-1 text-[11px] text-slate-500">Volume mensal</div>
        </div>

        {/* Visitantes Únicos Estimados */}
        <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Visitantes Únicos</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{data.uniqueVisitors}</div>
          <div className="mt-1 text-[11px] text-slate-500">Sessões anônimas 7d</div>
        </div>
      </div>

      {/* Status da Infraestrutura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-[#0d1322] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Links Ativos</div>
              <div className="text-lg font-bold text-white">{data.activeLinksCount}</div>
            </div>
          </div>
          <Link href="/admin/links" className="text-xs text-blue-400 hover:underline">
            Ver todos
          </Link>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0d1322] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Celulares / Aparelhos</div>
              <div className="text-lg font-bold text-white">{data.activeDevicesCount}</div>
            </div>
          </div>
          <Link href="/admin/devices" className="text-xs text-blue-400 hover:underline">
            Ver todos
          </Link>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0d1322] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Destinos WhatsApp/Web</div>
              <div className="text-lg font-bold text-white">{data.activeDestinationsCount}</div>
            </div>
          </div>
          <Link href="/admin/destinations" className="text-xs text-blue-400 hover:underline">
            Ver todos
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. GRÁFICO DE TRÁFEGO                                         */}
      {/* ============================================================== */}
      <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Evolução do Tráfego</h3>
            <p className="text-xs text-slate-400">Cliques e redirecionamentos registrados por dia</p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
            Últimos 7 dias
          </div>
        </div>
        <ClicksChart data={data.clicksByDay} />
      </div>

      {/* ============================================================== */}
      {/* 4. DESEMPENHO E RANKINGS                                      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Links */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Top Links</h3>
            <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {data.topLinks.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhum clique registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.topLinks.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-white truncate block">{link.name}</span>
                    <span className="font-mono text-[11px] text-blue-400">/{link.slug}</span>
                  </div>
                  <span className="font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded-full text-[11px] shrink-0">
                    {link.clicks} cliques
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Dispositivos */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Top Dispositivos</h3>
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {data.topDevices.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhum dado registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.topDevices.map((dev, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-white truncate block">{dev.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{dev.code}</span>
                  </div>
                  <span className="font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded-full text-[11px] shrink-0">
                    {dev.clicks} leads
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Destinos */}
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Top Destinos</h3>
            <Send className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {data.topDestinations.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhum dado registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.topDestinations.map((dest, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-white truncate block">{dest.name}</span>
                    <span className="capitalize text-[11px] text-slate-400">{dest.type}</span>
                  </div>
                  <span className="font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded-full text-[11px] shrink-0">
                    {dest.clicks} leads
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
