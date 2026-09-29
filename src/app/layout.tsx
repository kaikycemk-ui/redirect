import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeadRouter - Central de Controle e Redirecionamento de Tráfego',
  description: 'Gestão profissional de links, campanhas, fontes, dispositivos e destinos em alta velocidade.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0b0f19] text-slate-100 antialiased min-h-screen selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
