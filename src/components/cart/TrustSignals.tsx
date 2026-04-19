import { Lock, ShieldCheck, Truck } from "lucide-react";

export function TrustSignals() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border border-border bg-card text-[10px] font-bold tracking-wider text-foreground">
          PIX
        </span>
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border border-border bg-card text-[10px] font-bold tracking-wider text-foreground">
          BOLETO
        </span>
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border border-border bg-card text-[10px] font-bold tracking-wider text-foreground">
          VISA
        </span>
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border border-border bg-card text-[10px] font-bold tracking-wider text-foreground">
          MASTER
        </span>
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border border-border bg-card text-[10px] font-bold tracking-wider text-foreground">
          ELO
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <div className="flex flex-col items-center gap-1 text-center">
          <Lock className="h-4 w-4 text-foreground" strokeWidth={2} />
          <span>Site Seguro SSL</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <ShieldCheck className="h-4 w-4 text-foreground" strokeWidth={2} />
          <span>Garantia de Fábrica</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Truck className="h-4 w-4 text-foreground" strokeWidth={2} />
          <span>Frete Rastreado</span>
        </div>
      </div>
    </div>
  );
}
