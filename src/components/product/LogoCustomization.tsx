import { forwardRef, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const LOGO_POSITIONS = [
  "Peito esquerdo",
  "Costas",
  "Manga direita",
  "Manga esquerda",
  "Gola",
] as const;

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"];
const MAX_SIZE_MB = 10;

type Props = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  positions: string[];
  onPositionsChange: (v: string[]) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  notes: string;
  onNotesChange: (v: string) => void;
};

const sanitizeName = (name: string) =>
  name.replace(/[^\w.\-\s]/g, "").slice(0, 80);

export const LogoCustomization = forwardRef<HTMLDivElement, Props>(function LogoCustomization(
  { enabled, onEnabledChange, positions, onPositionsChange, file, onFileChange, notes, onNotesChange },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const togglePosition = (p: string) => {
    if (positions.includes(p)) onPositionsChange(positions.filter((x) => x !== p));
    else onPositionsChange([...positions, p]);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];

    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Formato não aceito", { description: "Envie PNG, JPG, SVG ou PDF." });
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: `Tamanho máximo: ${MAX_SIZE_MB}MB.` });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
    onFileChange(f);
  };

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      ref={ref}
      className={
        enabled
          ? "rounded-xl border border-foreground/15 bg-muted/30 px-4 py-3"
          : ""
      }
    >
      {/* Header with switch — discreto quando desligado */}
      <button
        type="button"
        onClick={() => onEnabledChange(!enabled)}
        className="flex items-center justify-between w-full px-1 py-1 text-left group"
      >
        <span className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          <Sparkles className="h-3.5 w-3.5" />
          Personalizar com a minha logo
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          aria-label="Personalizar com a minha logo"
          className="scale-75 origin-right"
        />
      </button>

      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            key="logo-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-5 space-y-5">
              {/* Positions */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Onde aplicar
                </div>
                <div className="flex flex-wrap gap-2">
                  {LOGO_POSITIONS.map((p) => {
                    const selected = positions.includes(p);
                    return (
                      <motion.button
                        key={p}
                        type="button"
                        onClick={() => togglePosition(p)}
                        whileTap={{ scale: 0.95 }}
                        aria-pressed={selected}
                        className={`h-10 px-4 rounded-full text-xs font-semibold border transition-colors ${
                          selected
                            ? "bg-foreground text-primary-foreground border-foreground"
                            : "bg-background text-foreground border-border hover:border-foreground/40"
                        }`}
                      >
                        {p}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Dropzone / file preview */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Sua logo
                </div>

                {!file ? (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFiles(e.dataTransfer.files);
                    }}
                    className={`flex flex-col items-center justify-center text-center cursor-pointer rounded-xl border-2 border-dashed min-h-[160px] px-4 py-6 transition-colors ${
                      dragOver
                        ? "border-foreground bg-background"
                        : "border-border bg-background hover:border-foreground/40"
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      hidden
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <Upload className="h-6 w-6 text-foreground mb-2" strokeWidth={1.75} />
                    <span className="text-sm font-semibold text-foreground">
                      Arraste sua logo aqui ou clique para enviar
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      PNG, JPG, SVG ou PDF · até 10MB · fundo transparente recomendado
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="h-16 w-16 rounded-lg border border-border bg-[conic-gradient(at_50%_50%,hsl(var(--muted))_25%,transparent_25%_50%,hsl(var(--muted))_50%_75%,transparent_75%)] bg-[length:16px_16px] flex items-center justify-center overflow-hidden shrink-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Pré-visualização da logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {sanitizeName(file.name)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      aria-label="Remover arquivo"
                      className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Observações <span className="normal-case font-normal text-muted-foreground/80">(opcional)</span>
                </div>
                <div className="relative">
                  <Textarea
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value.slice(0, 500))}
                    maxLength={500}
                    placeholder="Cores específicas, instruções de posicionamento, etc."
                    className="min-h-[88px] resize-none bg-background"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground tabular-nums">
                    {notes.length}/500
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-snug">
                Nossa equipe envia o mockup da arte aplicada para sua aprovação em até 24h antes da
                produção começar.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
