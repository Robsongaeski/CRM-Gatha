import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Product } from "@/data/products";

type Props = { product: Product };

export function ProductAccordion({ product }: Props) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="details">
        <AccordionTrigger className="text-sm font-semibold py-5 min-h-[48px]">
          Detalhes técnicos
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <li>
              <span className="text-foreground font-medium">Material:</span>{" "}
              {product.details.material}
            </li>
            <li>
              <span className="text-foreground font-medium">Caimento:</span> {product.details.fit}
            </li>
            <li>
              <span className="text-foreground font-medium">Gola:</span> {product.details.collar}
            </li>
            <li>
              <span className="text-foreground font-medium">Cuidados:</span> {product.details.care}
            </li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="customization">
        <AccordionTrigger className="text-sm font-semibold py-5 min-h-[48px]">
          Personalização e estampa
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.customization}</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="shipping" className="border-b-0">
        <AccordionTrigger className="text-sm font-semibold py-5 min-h-[48px]">
          Prazos e frete
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.shipping}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
