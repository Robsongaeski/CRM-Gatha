import { Star } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { ugcReviews } from "@/data/category";
import { ScrollReveal } from "./ScrollReveal";

export function SocialProofCarousel() {
  return (
    <section className="bg-muted/40 py-16 lg:py-24" aria-labelledby="social-heading">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <ScrollReveal className="max-w-2xl mb-10 lg:mb-14">
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
            Prova Social
          </span>
          <h2
            id="social-heading"
            className="mt-3 text-3xl lg:text-5xl font-black tracking-tight text-foreground"
          >
            Aprovado por equipes em todo o país.
          </h2>
        </ScrollReveal>

        <ScrollReveal>
          <Carousel
            opts={{ align: "start", loop: false, dragFree: true }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 lg:-ml-5">
              {ugcReviews.map((review) => (
                <CarouselItem
                  key={review.id}
                  className="pl-3 lg:pl-5 basis-[82%] sm:basis-1/2 lg:basis-1/3"
                >
                  <article className="bg-background rounded-2xl overflow-hidden border border-border h-full flex flex-col">
                    <div className="aspect-[4/5] bg-muted overflow-hidden">
                      <img
                        src={review.photo}
                        alt={`${review.name} usando camiseta AgroTech`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        width={1024}
                        height={1280}
                      />
                    </div>
                    <div className="p-5 lg:p-6 flex flex-col flex-1">
                      <div className="flex gap-0.5" aria-label="5 de 5 estrelas">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-star text-star" />
                        ))}
                      </div>
                      <blockquote className="mt-3 text-base lg:text-lg font-semibold text-foreground leading-snug flex-1">
                        “{review.quote}”
                      </blockquote>
                      <footer className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm font-semibold text-foreground">{review.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{review.company}</div>
                      </footer>
                    </div>
                  </article>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </ScrollReveal>
      </div>
    </section>
  );
}
