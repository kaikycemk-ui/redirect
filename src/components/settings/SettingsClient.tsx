'use client';

import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, Shield, Globe, Cpu } from 'lucide-react';
import { saveSettings } from '@/lib/actions/settings';

export function SettingsClient({ initialSettings }: { initialSettings: any }) {
  const [operationName, setOperationName] = useState(initialSettings.operation_name || 'LeadRouter Operation');
  const [domain, setDomain] = useState(initialSettings.domain || 'localhost:3000');
  const [globalFallback, setGlobalFallback] = useState(initialSettings.global_fallback_url || 'https://google.com');
  const [trackingEnabled, setTrackingEnabled] = useState(initialSettings.tracking_enabled ?? true);
  const [defaultStrategy, setDefaultStrategy] = useState(initialSettings.default_strategy || 'weighted');

  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);
    setErrorMsg(null);

    try {
      await saveSettings({
        operation_name: operationName,
        domain,
        global_fallback_url: globalFallback,
        tracking_enabled: trackingEnabled,
        default_strategy: defaultStrategy,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-500" />
          <span>Configurações Globais</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Defina as diretrizes do motor, domínios de publicação e URLs globais de contingência
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Configurações atualizadas com sucesso no banco de dados!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Operação</label>
          <input
            type="text"
            required
            value={operationName}
            onChange={(e) => setOperationName(e.target.value)}
            className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">Identificação exibida no cabeçalho do painel.</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Domínio de Produção</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">
              https://
            </span>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-[#162032] border border-slate-700 rounded-xl pl-16 pr-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Domínio utilizado para gerar os links públicos e QR Codes (ex: meusite.com).
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Fallback Global de Emergência</label>
          <input
            type="url"
            required
            value={globalFallback}
            onChange={(e) => setGlobalFallback(e.target.value)}
            className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            Caso um link não encontre nenhum aparelho disponível e não possua fallback próprio, este endereço será utilizado.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Estratégia Padrão</label>
          <select
            value={defaultStrategy}
            onChange={(e) => setDefaultStrategy(e.target.value)}
            className="w-full bg-[#162032] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="weighted">Weighted (Distribuição Ponderada por Pesos)</option>
            <option value="round_robin">Round Robin (Sequencial Cíclico)</option>
            <option value="random">Random (Sorteio Aleatório)</option>
          </select>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="track"
              checked={trackingEnabled}
              onChange={(e) => setTrackingEnabled(e.target.checked)}
              className="rounded border-slate-700 bg-[#162032] text-blue-600 focus:ring-0"
            />
            <label htmlFor="track" className="text-xs font-semibold text-white cursor-pointer">
              Ativar rastreamento de cliques e telemetria anônima
            </label>
          </div>
          <p className="text-[11px] text-slate-400 pl-5">
            Registra session_id anônimo, hash SHA-256 de IP e dados de dispositivo sem atrasar a resposta de redirecionamento.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
