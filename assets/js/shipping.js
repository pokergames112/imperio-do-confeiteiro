// Módulo de cálculo de Frete e CEP (ViaCEP API + Regras de Recife e Região)

export const shippingRules = {
  freeShippingThreshold: 150.00, // Frete Grátis acima de R$ 150
  defaultRecifeRate: 12.00,      // Motoboy Recife
  defaultMetroRate: 22.00,       // Região Metropolitana (Olinda, Jaboatão, Camaragibe, Paulista)
  defaultStateRate: 35.00        // Interior de Pernambuco / Outros
};

export async function consultCep(cep) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    throw new Error('CEP inválido. Digite 8 dígitos.');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      throw new Error('CEP não encontrado. Verifique o número digitado.');
    }

    // Calcula valor estimado de frete com base na localidade
    const city = (data.localidade || '').toLowerCase();
    const uf = (data.uf || '').toUpperCase();
    let shippingValue = shippingRules.defaultStateRate;
    let deadline = 'Até 4 dias úteis';
    let courier = 'Transportadora / Mandaê';

    if (city.includes('recife')) {
      shippingValue = shippingRules.defaultRecifeRate;
      deadline = 'Hoje ou até 24h úteis';
      courier = 'Motoboy Express Recife';
    } else if (['olinda', 'jaboatão dos guararapes', 'jaboatao dos guararapes', 'camaragibe', 'paulista', 'são lourenço da mata'].some(c => city.includes(c))) {
      shippingValue = shippingRules.defaultMetroRate;
      deadline = '1 a 2 dias úteis';
      courier = 'Entrega Região Metropolitana';
    } else if (uf === 'PE') {
      shippingValue = shippingRules.defaultStateRate;
      deadline = '2 a 5 dias úteis';
      courier = 'Mandaê / Sedex';
    }

    return {
      success: true,
      cep: data.cep,
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      uf: data.uf,
      formattedAddress: `${data.logradouro ? data.logradouro + ' - ' : ''}${data.bairro ? data.bairro + ', ' : ''}${data.localidade} - ${data.uf}`,
      shippingValue,
      deadline,
      courier
    };
  } catch (err) {
    throw new Error(err.message || 'Erro ao consultar o CEP.');
  }
}
