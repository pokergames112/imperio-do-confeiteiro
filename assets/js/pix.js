// Módulo de Geração e Simulação de Pix (QR Code + Copia e Cola)

export function generatePixPayload({ key = 'imperiodoconfeiteiro@hotmail.com', name = 'IMPERIO DO CONFEITEIRO', city = 'RECIFE', amount = 0.00, txid = 'PEDIDO' }) {
  const formattedAmount = amount.toFixed(2);
  
  // Payload simplificado para demonstração / simulação real
  const payloadString = `00020126580014br.gov.bcb.pix0136${key}520400005303986540${formattedAmount.length}${formattedAmount}5802BR59${name.length}${name}60${city.length}${city}62070503***6304`;
  
  // URL da imagem do QR Code
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payloadString)}`;

  return {
    key,
    name,
    city,
    amount: formattedAmount,
    payload: payloadString,
    qrCodeUrl
  };
}
