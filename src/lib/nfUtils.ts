/**
 * Extrai o número da NF a partir da chave NF-e (44 dígitos).
 * Posições 26-34 (0-indexed: 25 a 33) contêm o número da NF com 9 dígitos.
 * Remove zeros à esquerda.
 */
export function extrairNumeroNF(chaveNfe: string | null | undefined): string {
  if (!chaveNfe || chaveNfe.length !== 44) return '';
  const numeroRaw = chaveNfe.substring(25, 34);
  return numeroRaw.replace(/^0+/, '') || '0';
}
