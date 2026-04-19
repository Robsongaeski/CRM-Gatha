import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

type Props = {
  phone: string;
  message: string;
  label?: string;
};

export function WhatsAppButton({ phone, message, label = "Comprar com Atendente" }: Props) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-whatsapp text-whatsapp-foreground font-semibold text-base hover:opacity-95 transition-opacity"
    >
      <MessageCircle className="h-5 w-5" strokeWidth={2} fill="currentColor" />
      {label}
    </motion.a>
  );
}
