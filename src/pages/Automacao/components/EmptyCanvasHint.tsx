import React from 'react';
import { Zap, ArrowRight, Settings } from 'lucide-react';

export function EmptyCanvasHint() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="bg-background/80 backdrop-blur-sm border border-dashed border-muted-foreground/30 rounded-2xl p-8 max-w-md mx-4">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">1</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Comece seu fluxo de automação
            </h3>
            <p className="text-sm text-muted-foreground">
              Arraste um <strong className="text-green-600 dark:text-green-400">Gatilho</strong> da paleta à esquerda para iniciar
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Gatilho</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Ações</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <div className="flex items-center gap-1.5">
              <Settings className="h-3 w-3" />
              <span>Configure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
