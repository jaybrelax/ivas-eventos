import * as React from "react";

interface LaserBorderProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  glowColor?: string;
  duration?: number;
  width?: number;
  rx?: number;
}

export function LaserBorder({
  children,
  className = "",
  color = "#3b82f6",
  glowColor = "#a855f7",
  duration = 4,
  width = 2,
  rx = 6,
}: LaserBorderProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius: rx,
        padding: width,
      }}
    >
      {/* Container da Cobrinha / Raio Laser */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        {/* A Cobrinha */}
        <div
          className="absolute inset-[-100%] z-[-1] mx-auto my-auto aspect-square"
          style={{
            animation: `spin ${duration}s linear infinite`,
            background: `conic-gradient(from 0deg, transparent 60%, ${glowColor} 85%, ${color} 100%)`,
          }}
        />
        {/* Camada de Glow da Cobrinha */}
        <div
          className="absolute inset-[-100%] z-[-1] mx-auto my-auto aspect-square blur-lg opacity-80"
          style={{
            animation: `spin ${duration}s linear infinite`,
            background: `conic-gradient(from 0deg, transparent 60%, ${glowColor} 85%, ${color} 100%)`,
          }}
        />
      </div>

      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* Conteúdo (mascara o meio do gradiente deixando só a borda visível) */}
      <div className="relative z-10 w-full h-full rounded-[calc(inherit-2px)] bg-white dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}
