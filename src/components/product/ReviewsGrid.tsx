import { Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Review } from "@/data/products";

type Props = { reviews: Review[]; rating: number; reviewCount: number };

export function ReviewsGrid({ reviews, rating, reviewCount }: Props) {
  return (
    <section className="px-4 py-10 lg:py-16 bg-muted/40 border-t border-border">
      <div className="max-w-screen-md mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Quem usa, recomenda
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex" aria-label={`${rating} de 5 estrelas`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-star text-star" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {rating}/5 · {reviewCount} avaliações
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((r, i) => (
            <motion.article
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-background rounded-2xl border border-border p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={r.avatar}
                  alt={r.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.location}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-star text-star" />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">{r.date}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">"{r.text}"</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
