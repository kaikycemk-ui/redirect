-- ==============================================================================
-- LeadRouter - Schema de Banco de Dados PostgreSQL & Supabase
-- Migrations completas com RLS, Triggers e Índices de Alta Performance
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabela: sources (Fontes de tráfego: TikTok, Instagram, Facebook, etc.)
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabela: campaigns (Campanhas com datas e status)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabela: devices (Aparelhos físicos/celulares cadastrados)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    model TEXT,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    maintenance BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabela: destinations (Números de WhatsApp, links do Telegram, etc. vinculados ao device)
CREATE TABLE IF NOT EXISTS public.destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (type IN ('whatsapp', 'telegram', 'website', 'other')),
    url TEXT NOT NULL,
    phone_number TEXT,
    weight INTEGER NOT NULL DEFAULT 100 CHECK (weight >= 0),
    tags TEXT[] DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Tabela: links (Links públicos de redirecionamento)
CREATE TABLE IF NOT EXISTS public.links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    strategy TEXT NOT NULL DEFAULT 'weighted' CHECK (strategy IN ('round_robin', 'random', 'weighted')),
    destination_strategy TEXT NOT NULL DEFAULT 'weighted' CHECK (destination_strategy IN ('round_robin', 'random', 'weighted')),
    fallback_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Tabela: link_devices (Associação N:N entre Links e Dispositivos com Pesos)
CREATE TABLE IF NOT EXISTS public.link_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    weight INTEGER NOT NULL DEFAULT 100 CHECK (weight >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(link_id, device_id)
);

-- 9. Tabela: clicks (Histórico imutável de cliques e tracking de alta resolução)
CREATE TABLE IF NOT EXISTS public.clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES public.links(id) ON DELETE SET NULL,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
    session_id TEXT,
    ip_hash TEXT NOT NULL,
    user_agent TEXT,
    referer TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Tabela: audit_logs (Histórico de alterações administrativas)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Tabela: app_settings (Configurações operacionais gerais)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inserir configurações padrão
INSERT INTO public.app_settings (key, value)
VALUES 
    ('general', '{"operation_name": "LeadRouter Operation", "domain": "localhost:3000", "global_fallback_url": "https://google.com", "tracking_enabled": true, "default_strategy": "weighted"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 12. State tracker para Round Robin seguro e rápido
CREATE TABLE IF NOT EXISTS public.round_robin_state (
    entity_key TEXT PRIMARY KEY,
    last_index INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ÍNDICES DE ALTA PERFORMANCE (Conforme requisitos de latência crítica)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_links_slug ON public.links(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_sources_slug ON public.sources(slug);
CREATE INDEX IF NOT EXISTS idx_devices_code ON public.devices(code);

CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON public.clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_source_id ON public.clicks(source_id);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_id ON public.clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clicks_device_id ON public.clicks(device_id);
CREATE INDEX IF NOT EXISTS idx_clicks_destination_id ON public.clicks(destination_id);
CREATE INDEX IF NOT EXISTS idx_link_devices_link_id ON public.link_devices(link_id);
CREATE INDEX IF NOT EXISTS idx_destinations_device_id ON public.destinations(device_id);

-- ==============================================================================
-- TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    CREATE TRIGGER update_sources_modtime BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_campaigns_modtime BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_devices_modtime BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_destinations_modtime BEFORE UPDATE ON public.destinations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_links_modtime BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

-- ==============================================================================
-- TRIGGER PARA CRIAÇÃO DE PERFIL AUTOMÁTICO APÓS SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
BEGIN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
EXCEPTION WHEN others THEN NULL; END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_robin_state ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados (Admin/Owner/Viewer) têm acesso ao painel
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Fontes
CREATE POLICY "Allow authenticated all sources" ON public.sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Campanhas
CREATE POLICY "Allow authenticated all campaigns" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Dispositivos
CREATE POLICY "Allow authenticated all devices" ON public.devices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Destinos
CREATE POLICY "Allow authenticated all destinations" ON public.destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Links
CREATE POLICY "Allow authenticated all links" ON public.links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Link Devices
CREATE POLICY "Allow authenticated all link_devices" ON public.link_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clicks (Painel pode ler todos os cliques)
CREATE POLICY "Allow authenticated read clicks" ON public.clicks FOR SELECT TO authenticated USING (true);
-- Clicks são gravados pelo engine via service role (ignora RLS); sem acesso anônimo

-- Audit Logs
CREATE POLICY "Allow authenticated read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- App Settings
CREATE POLICY "Allow authenticated all app_settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Round Robin State
CREATE POLICY "Allow authenticated all round_robin_state" ON public.round_robin_state FOR ALL TO authenticated USING (true) WITH CHECK (true);