import { Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const rows = [
  { size: "P", chest: "94", length: "68", sleeve: "62" },
  { size: "M", chest: "100", length: "70", sleeve: "63" },
  { size: "G", chest: "106", length: "72", sleeve: "64" },
  { size: "GG", chest: "112", length: "74", sleeve: "65" },
  { size: "XGG", chest: "118", length: "76", sleeve: "66" },
  { size: "XXGG", chest: "124", length: "78", sleeve: "67" },
];

export function SizeGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors min-h-[32px]"
        >
          <Ruler className="h-3.5 w-3.5" />
          Guia de Medidas
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Guia de Medidas</DialogTitle>
          <DialogDescription>
            Medidas aproximadas em centímetros. Tolerância de ±2cm.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left font-semibold py-2.5 px-3">Tamanho</th>
                <th className="text-right font-semibold py-2.5 px-3">Tórax</th>
                <th className="text-right font-semibold py-2.5 px-3">Comp.</th>
                <th className="text-right font-semibold py-2.5 px-3">Manga</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.size} className={i % 2 ? "bg-secondary/30" : ""}>
                  <td className="py-2.5 px-3 font-semibold">{r.size}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{r.chest} cm</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{r.length} cm</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{r.sleeve} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Dúvidas? Fale com nosso atendente pelo WhatsApp para uma recomendação personalizada.
        </p>
      </DialogContent>
    </Dialog>
  );
}
