import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Flame } from "lucide-react";

type Props = {
  images: { src: string; alt: string }[];
};

export function ProductGallery({ images }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="relative lg:flex lg:gap-4 lg:max-h-[calc(100vh-6rem)]">
      {/* Desktop: vertical thumbnails */}
      <div className="hidden lg:flex lg:flex-col lg:gap-2 lg:shrink-0">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Ver imagem ${i + 1}`}
            className={`h-[88px] w-[88px] rounded-lg overflow-hidden border-2 transition-all bg-gradient-to-b from-muted/60 to-muted/20 ${
              i === selected
                ? "border-foreground"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main image area */}
      <div className="relative flex-1 bg-gradient-to-b from-muted/60 to-muted/20">
        <div className="overflow-hidden lg:rounded-xl" ref={emblaRef}>
          <div className="flex">
            {images.map((img, i) => (
              <div
                key={i}
                className="flex-[0_0_100%] min-w-0 aspect-[4/5] relative flex items-center justify-center"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  width={1024}
                  height={1280}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                  className="w-full h-full object-cover [filter:drop-shadow(0_25px_25px_hsl(var(--foreground)/0.12))]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Floating bestseller badge — top right */}
        <div className="absolute top-4 right-4 z-10">
          <div className="inline-flex items-center gap-1.5 bg-background/95 backdrop-blur shadow-md rounded-full pl-2.5 pr-3 py-1.5 text-xs font-semibold text-foreground">
            <Flame className="h-3.5 w-3.5 text-scarcity" fill="currentColor" />
            Mais Vendido no Agro
          </div>
        </div>

        {/* Dots — mobile only, bottom right */}
        <div className="absolute bottom-4 right-4 flex gap-1.5 z-10 lg:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Ir para imagem ${i + 1}`}
              className="h-2 flex items-center justify-center"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  i === selected ? "w-6 h-1.5 bg-foreground" : "w-1.5 h-1.5 bg-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
