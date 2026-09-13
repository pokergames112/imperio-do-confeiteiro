import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://paeioczhrifbitwejgde.supabase.co';
// Usamos APENAS a chave pública/publishable no frontend (a chave secreta é protegida e nunca exposta no navegador)
const SUPABASE_ANON_KEY = 'sb_publishable_0KpcbOtwnSbeybTIPiPAbw_qypfNSPx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Salva o pedido diretamente na tabela 'pedidos' do Supabase em tempo real
 */
export async function saveOrderToSupabase(orderData) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        codigo_pedido: orderData.code || `IC-${Math.floor(1000 + Math.random() * 9000)}`,
        nome_cliente: orderData.name,
        whatsapp: orderData.phone,
        email: orderData.email || null,
        cpf: orderData.cpf || null,
        tipo_entrega: orderData.deliveryType || 'Entrega',
        endereco: orderData.address || '',
        bairro: orderData.neighborhood || null,
        cidade: orderData.city || null,
        cep: orderData.cep || null,
        itens: orderData.itemsText,
        subtotal: orderData.subtotal,
        frete: orderData.shippingCost,
        total: orderData.total,
        forma_pagamento: orderData.paymentMethod,
        status: 'Novo Pedido'
      }])
      .select();

    if (error) {
      console.error('[Supabase] Erro ao salvar pedido:', error);
      return { success: false, error: error.message };
    }

    console.log('[Supabase] Pedido gravado com sucesso no banco:', data);
    return { success: true, data };
  } catch (err) {
    console.error('[Supabase] Erro na requisição:', err);
    return { success: false, error: err.message };
  }
}
