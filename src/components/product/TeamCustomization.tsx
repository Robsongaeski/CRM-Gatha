import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Hash, Shirt, Sparkles, Upload, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"];
const MAX_SIZE_MB = 10;

export type TeamRoster = {
  number: string;
  name: string;
};

type Color = { name: string; hex: string };

type Props = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  colors: Color[];
  selectedColor: string | null;
  onSelectedColorChange: (hex: string | null) => void;
  customColor: string;
  onCustomColorChange: (v: string) => void;
  teamName: string;
  onTeamNameChange: (v: string) => void;
  roster: TeamRoster[];
  onRosterChange: (v: TeamRoster[]) => void;
  crestFile: File | null;
  onCrestFileChange: (f: File | null) => void;
  notes: string;
  onNotesChange: (v: string) => void;
};

export const TeamCustomization = forwardRef<HTMLDivElement, Props>(function TeamCustomization(
  {
    enabled,
    onEnabledChange,
    colors,
    selectedColor,
    onSelectedColorChange,
    customColor,
    onCustomColorChange,
    teamName,
    onTeamNameChange,
    roster,
    onRosterChange,
    crestFile,
    onCrestFileChange,
    notes,
    onNotesChange,
  },
  ref,
) {
  const [dragOver, setDragOver] = useState(false);

  const updateRosterItem = (i: number, patch: Partial<TeamRoster>) => {
    const next = roster.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onRosterChange(next);
  };

  const addRosterRow = () => {
    if (roster.length >= 25) {
      toast.info("Máximo de 25 atletas por pedido. Use as observações para times maiores.");
      return;
    }
    onRosterChange([...roster, { number: "", name: "" }]);
  };

  const removeRosterRow = (i: number) => {
    onRosterChange(roster.filter((_, idx) => idx !== i));
  };

  const handleFile = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Formato inválido", { description: "Use PNG, JPG, SVG ou PDF." });
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (máx ${MAX_SIZE_MB}MB)`);
      return;
    }
    onCrestFileChange(f);
    toast.success("Escudo enviado", { description: f.name });
  };

  return (
    <div ref={ref} className="border border-border rounded-2xl overflow-hidden bg-background">
      {/* Header toggle */}
      <label className="flex items-center justify-between gap-3 p-4 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center">
            <Shirt className="h-5 w-5 text-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              Personalizar uniformes do time
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-price-deal-bg text-price-deal">
                Grátis
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cor do time, escudo, nome e número de cada atleta.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </label>

      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-1 space-y-6 border-t border-border">
              {/* Cor do time */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Cor principal
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const active = selectedColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          onSelectedColorChange(c.hex);
                          onCustomColorChange("");
                        }}
                        aria-pressed={active}
                        title={c.name}
                        className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                          active
                            ? "border-foreground scale-110 ring-2 ring-foreground/20"
                            : "border-border hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {active && (
                          <Check
                            className="absolute inset-0 m-auto h-4 w-4"
                            style={{ color: isLight(c.hex) ? "#0F172A" : "#fff" }}
                            strokeWidth={3}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    value={customColor}
                    onChange={(e) => {
                      onCustomColorChange(e.target.value);
                      if (e.target.value) onSelectedColorChange(null);
                    }}
                    placeholder="Outra cor (ex: Vinho com detalhes dourados)"
                    className="h-11 text-sm"
                    maxLength={80}
                  />
                </div>
              </div>

              {/* Nome do time + escudo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Nome do time / turma
                  </label>
                  <Input
                    value={teamName}
                    onChange={(e) => onTeamNameChange(e.target.value.slice(0, 30))}
                    placeholder="Ex: Tigers FC"
                    className="mt-2 h-11 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Escudo (opcional)
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFile(e.dataTransfer.files);
                    }}
                    className={`mt-2 h-11 rounded-md border border-dashed flex items-center px-3 gap-2 text-xs transition-colors cursor-pointer ${
                      dragOver ? "border-foreground bg-foreground/5" : "border-border"
                    }`}
                  >
                    {crestFile ? (
                      <>
                        <Sparkles className="h-4 w-4 text-foreground shrink-0" />
                        <span className="truncate flex-1">{crestFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCrestFileChange(null);
                          }}
                          className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center"
                          aria-label="Remover escudo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer w-full">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">PNG, JPG, SVG ou PDF</span>
                        <input
                          type="file"
                          accept={ACCEPTED_TYPES.join(",")}
                          className="hidden"
                          onChange={(e) => handleFile(e.target.files)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Roster */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Nome e número (opcional)
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    {roster.length} atleta{roster.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione um por linha. Você pode enviar a lista completa pelo WhatsApp depois.
                </p>

                <div className="mt-3 space-y-2">
                  {roster.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="relative w-20 shrink-0">
                        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={r.number}
                          onChange={(e) =>
                            updateRosterItem(i, { number: e.target.value.replace(/\D/g, "").slice(0, 3) })
                          }
                          placeholder="10"
                          inputMode="numeric"
                          className="h-11 pl-7 text-sm tabular-nums"
                        />
                      </div>
                      <Input
                        value={r.name}
                        onChange={(e) =>
                          updateRosterItem(i, { name: e.target.value.toUpperCase().slice(0, 14) })
                        }
                        placeholder="NOME"
                        className="h-11 text-sm uppercase tracking-wide"
                      />
                      <button
                        type="button"
                        onClick={() => removeRosterRow(i)}
                        aria-label="Remover linha"
                        className="h-11 w-11 rounded-md border border-border hover:bg-muted flex items-center justify-center shrink-0"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addRosterRow}
                  className="mt-3 w-full h-11 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  + Adicionar atleta
                </button>
              </div>

              {/* Obs */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Observações (opcional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value.slice(0, 280))}
                  placeholder="Ex: patrocinador na manga direita, número também na frente, gola amarela…"
                  className="mt-2 text-sm resize-none"
                  rows={3}
                />
                <div className="mt-1 text-[10px] text-muted-foreground text-right">
                  {notes.length}/280
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function isLight(hex: string) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
}
