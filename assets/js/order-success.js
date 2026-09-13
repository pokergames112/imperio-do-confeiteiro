import { generatePixPayload } from './pix.js';
import { formatCurrency } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const orderJson = sessionStorage.getItem('current_order') || localStorage.getItem('last_placed_order');
  
  if (!orderJson) {
    window.location.href = 'index.html';
    return;
  }

  const order = JSON.parse(orderJson);

  // Render Elements
  document.getElementById('displayOrderCode').textContent = `#${order.code || 'IC-1042'}`;
  document.getElementById('successClientName').textContent = order.name;
  document.getElementById('successClientPhone').textContent = order.phone;
  document.getElementById('successClientAddress').textContent = order.address;
  document.getElementById('successSubtotal').textContent = formatCurrency(order.subtotal);
  document.getElementById('successShipping').textContent = order.shippingCost > 0 ? formatCurrency(order.shippingCost) : 'Grátis';
  document.getElementById('successTotal').textContent = formatCurrency(order.total);
  document.getElementById('successPaymentMethod').textContent = order.paymentMethod;

  // Render Items List (Protegido contra DOM XSS)
  const itemsContainer = document.getElementById('successItemsList');
  itemsContainer.innerHTML = '';
  (order.items || []).forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '4px 0';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `${item.qty}x ${item.name}`;

    const priceStrong = document.createElement('strong');
    priceStrong.textContent = formatCurrency(item.clubPrice * item.qty);

    row.appendChild(titleSpan);
    row.appendChild(priceStrong);
    itemsContainer.appendChild(row);
  });

  // Pix Logic Oficial Banco Central
  const pixBox = document.getElementById('successPixBox');
  if (order.paymentMethod.toLowerCase().includes('pix')) {
    pixBox.style.display = 'block';
    const cleanTxid = (order.code || 'PEDIDO').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
    const pix = generatePixPayload({ amount: order.total, txid: cleanTxid });
    document.getElementById('successPixQr').src = pix.qrCodeUrl;
    document.getElementById('successPixKey').value = pix.payload;

    // Copy Pix Button
    const btnCopy = document.getElementById('btnSuccessCopyPix');
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(pix.payload);
      btnCopy.textContent = 'Copiado! ✓';
      setTimeout(() => { btnCopy.textContent = 'Copiar Chave'; }, 2000);
    });

    // Simulate Paid (Demo)
    const btnSimulatePaid = document.getElementById('btnSimulatePaid');
    const statusText = document.getElementById('displayOrderStatus');
    btnSimulatePaid.addEventListener('click', () => {
      statusText.innerHTML = '✅ Pagamento Aprovado com Sucesso!';
      statusText.style.color = '#047857';
      pixBox.style.background = '#ecfdf5';
      pixBox.style.borderColor = '#10b981';
      pixBox.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <div style="font-size: 44px; margin-bottom: 8px;">🎉</div>
          <h3 style="font-weight: 900; color: #065f46; font-size: 20px;">Pagamento Confirmado no Banco!</h3>
          <p style="font-size: 13px; color: #047857; margin-top: 4px;">Seu pedido já entrou na esteira de separação no depósito da Império do Confeiteiro.</p>
        </div>
      `;
    });

  } else {
    pixBox.style.display = 'none';
    document.getElementById('displayOrderStatus').textContent = 'Pedido Recebido (Aguardando Entrega)';
  }

  // Setup WhatsApp Action Button
  const btnWhatsApp = document.getElementById('btnOpenWhatsAppDirect');
  const eCake = '\u{1F370}';
  const eUser = '\u{1F464}';
  const ePhone = '\u{1F4F1}';
  const eMail = '\u{1F4E7}';
  const eBox = '\u{1F4E6}';
  const eCart = '\u{1F6D2}';
  const eTruck = '\u{1F69A}';
  const eMoney = '\u{1F4B0}';
  const eCard = '\u{1F4B3}';
  const ePin = '\u{1F4CD}';

  const itemsText = (order.items || []).map(i => `• ${i.qty}x ${i.name} (${formatCurrency(i.clubPrice * i.qty)})`).join('\n');

  const whatsappMessage = 
`${eCake} *PEDIDO #${order.code || 'IC-1042'} - IMPÉRIO DO CONFEITEIRO*
----------------------------------------
${eUser} *Cliente:* ${order.name}
${ePhone} *WhatsApp:* ${order.phone}
${eMail} *E-mail:* ${order.email || 'Não informado'}

${eBox} *ITENS DO PEDIDO:*
${itemsText}

----------------------------------------
${eCart} *Subtotal:* ${formatCurrency(order.subtotal)}
${eTruck} *Entrega:* ${order.shippingCost > 0 ? formatCurrency(order.shippingCost) : 'Grátis'}
${eMoney} *TOTAL DO PEDIDO:* ${formatCurrency(order.total)}
${eCard} *Forma de Pagamento:* ${order.paymentMethod}
${ePin} *Endereço:* ${order.address}
----------------------------------------
_Pedido registrado e salvo no sistema da Império do Confeiteiro_`;

  // Número de WhatsApp para teste (Igor - PRIME RANK)
  // Quando for para produção final com a cliente, trocar de volta para '5581989859211'
  const storeWhatsAppNumber = '5581989780241';
  btnWhatsApp.href = `https://wa.me/${storeWhatsAppNumber}?text=${encodeURIComponent(whatsappMessage)}`;
});
