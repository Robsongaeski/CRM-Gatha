import { Navigate } from 'react-router-dom';

// Redireciona para a página de atendimento por padrão
export default function WhatsAppHub() {
  return <Navigate to="/whatsapp/atendimento" replace />;
}
