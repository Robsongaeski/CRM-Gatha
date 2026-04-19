import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const messages = [
  "Frete Grátis em pedidos acima de R$ 499",
  "Descontos progressivos para equipes",
  "Produção sob medida em até 15 dias úteis",
];

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-foreground text-primary-foreground h-9 lg:h-10 flex items-center justify-center overflow-hidden text-xs font-medium tracking-wide">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="px-4"
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
