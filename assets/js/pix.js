// Módulo Oficial de Geração Pix Padrão Banco Central do Brasil (BR Code EMV + CRC16)

function formatField(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function calculateCRC16(payload) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload({
  key = '7b662f4e-1359-4286-b934-981ba4fe4769',
  name = 'IMPERIO CONFEIT',
  city = 'RECIFE',
  amount = 0.00,
  txid = '***'
}) {
  const cleanKey = String(key).trim();
  const cleanName = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25).toUpperCase();
  const cleanCity = String(city).normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15).toUpperCase();
  const cleanTxid = String(txid || '***').replace(/[^a-zA-Z0-9*]/g, '').slice(0, 25) || '***';
  const numericAmount = Number(amount || 0);

  // 00 - Payload Format Indicator
  const f00 = formatField('00', '01');

  // 26 - Merchant Account Information (Banco Central Pix)
  const f26_00 = formatField('00', 'br.gov.bcb.pix');
  const f26_01 = formatField('01', cleanKey);
  const f26 = formatField('26', f26_00 + f26_01);

  // 52 - Merchant Category Code
  const f52 = formatField('52', '0000');

  // 53 - Transaction Currency (986 = Real BRL)
  const f53 = formatField('53', '986');

  // 54 - Transaction Amount (Valor fixo e atrelado ao pedido)
  let f54 = '';
  if (numericAmount > 0) {
    f54 = formatField('54', numericAmount.toFixed(2));
  }

  // 58 - Country Code
  const f58 = formatField('58', 'BR');

  // 59 - Merchant Name
  const f59 = formatField('59', cleanName);

  // 60 - Merchant City
  const f60 = formatField('60', cleanCity);

  // 62 - Additional Data Field Template (TxID do pedido)
  const f62_05 = formatField('05', cleanTxid);
  const f62 = formatField('62', f62_05);

  // 63 - CRC16 Checksum
  const rawPayload = `${f00}${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;
  const checksum = calculateCRC16(rawPayload);
  const fullPixCode = `${rawPayload}${checksum}`;

  // QR Code gerado em alta resolução a partir do payload oficial do Banco Central
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(fullPixCode)}`;

  return {
    key: cleanKey,
    name: cleanName,
    city: cleanCity,
    amount: numericAmount.toFixed(2),
    payload: fullPixCode, // Código Oficial Pix Copia e Cola com valor travado
    qrCodeUrl
  };
}

