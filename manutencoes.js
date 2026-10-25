export const CATALOGO_EQUIPAMENTOS = {
  ar_condicionado: {
    nome: "ar condicionado",
    artigo: "do seu sistema de ar condicionado",
    grupo_sazonal: "primavera",
    beneficio: "higienização de filtros, desinfeção de serpentinas e garantia da qualidade do ar"
  },
  bc_aqs: {
    nome: "bomba de calor de AQS",
    artigo: "da sua bomba de calor de águas quentes sanitárias (AQS)",
    grupo_sazonal: "anual",
    beneficio: "verificação do ânodo de proteção do termoacumulador e controlo das válvulas de segurança"
  },
  bc_clima: {
    nome: "bomba de calor de climatização",
    artigo: "da sua bomba de calor de climatização",
    grupo_sazonal: "outono",
    beneficio: "limpeza de filtros de água do circuito, controlo de pressões e teste de eficiência"
  },
  piso_radiante: {
    nome: "piso radiante",
    artigo: "do seu sistema de piso radiante",
    grupo_sazonal: "outono",
    beneficio: "controlo de lamas no circuito, purga de ar dos coletores e verificação dos atuadores térmicos e caudalímetros"
  },
  ventiloconvectores: {
    nome: "ventiloconvectores",
    artigo: "dos seus ventiloconvectores",
    grupo_sazonal: "anual",
    beneficio: "limpeza de filtros de ar e desobstrução das linhas de condensados"
  },
  vmc: {
    nome: "sistema de ventilação VMC",
    artigo: "do seu sistema de ventilação mecânica (VMC)",
    grupo_sazonal: "anual",
    beneficio: "substituição/limpeza de filtros para assegurar ar novo e livre de impurezas"
  },
  solar_termico: {
    nome: "sistema solar térmico",
    artigo: "do seu sistema solar térmico",
    grupo_sazonal: "anual",
    beneficio: "controlo do nível de anticongelante (fluido solar), vaso de expansão e estanquidade"
  },
  bc_piscina: {
    nome: "bomba de calor de piscina",
    artigo: "da bomba de calor da piscina",
    grupo_sazonal: "primavera",
    beneficio: "revisão técnica antes do arranque da época balnear e controlo do permutador"
  },
  upac: {
    nome: "sistema solar fotovoltaico",
    artigo: "do seu sistema solar fotovoltaico (UPAC)",
    grupo_sazonal: "anual",
    beneficio: "limpeza profissional dos módulos e verificação das ligações para assegurar produção máxima"
  }
};

export function calcularDataLembrete(dataConclusaoStr, equipamentos = []) {
  if (!dataConclusaoStr) return new Date().toISOString().split('T')[0];
  const dataConclusao = new Date(dataConclusaoStr);
  const ano = dataConclusao.getFullYear();

  const temOutono = equipamentos.some(eq => CATALOGO_EQUIPAMENTOS[eq]?.grupo_sazonal === 'outono');
  const temPrimavera = equipamentos.some(eq => CATALOGO_EQUIPAMENTOS[eq]?.grupo_sazonal === 'primavera');

  // Regra 1: Outono (Piso Radiante / BC Clima) -> Alvo: 1 de Outubro (mês 9 no JS)
  if (temOutono) {
    let alvo = new Date(ano, 9, 1);
    const dias = (alvo - dataConclusao) / (1000 * 60 * 60 * 24);
    if (dias < 180) alvo.setFullYear(ano + 1); // Carência mínima de 6 meses
    return alvo.toISOString().split('T')[0];
  }

  // Regra 2: Primavera (AC / Piscina) -> Alvo: 15 de Abril (mês 3 no JS)
  if (temPrimavera) {
    let alvo = new Date(ano, 3, 15);
    const dias = (alvo - dataConclusao) / (1000 * 60 * 60 * 24);
    if (dias < 180) alvo.setFullYear(ano + 1);
    return alvo.toISOString().split('T')[0];
  }

  // Regra 3: Geral (AQS, VMC, UPAC, etc.) -> 335 dias (~11 meses) após a montagem
  const dataGeral = new Date(dataConclusao);
  dataGeral.setDate(dataGeral.getDate() + 335);
  return dataGeral.toISOString().split('T')[0];
}

export function gerarTextoLembrete(clienteNome, equipamentos = []) {
  const nomeCliente = clienteNome || "Cliente";

  if (!equipamentos || equipamentos.length === 0) {
    return `Olá ${nomeCliente}! Daqui é a ENAT. A sua instalação está prestes a completar 1 ano. Recomendamos a revisão anual preventiva para garantir o correto funcionamento e manter a garantia ativa. Podemos agendar a visita para esta semana ou na próxima?`;
  }

  // Caso isolado: UPAC
  if (equipamentos.length === 1 && equipamentos[0] === 'upac') {
    return `Olá ${nomeCliente}! Daqui é a ENAT.\n\nO seu sistema solar fotovoltaico está a completar 1 ano de funcionamento. ☀️\n\nCom a acumulação de poeiras e pólen ao longo do ano, os painéis chegam a perder rendimento. Recomendamos a lavagem técnica dos módulos e a verificação geral do sistema para garantir que continua a tirar o proveito máximo da sua fatura de luz.\n\nGostaria de agendar a limpeza para estes dias? Responda a esta mensagem para combinarmos.`;
  }

  // Caso isolado: 1 equipamento
  if (equipamentos.length === 1) {
    const item = CATALOGO_EQUIPAMENTOS[equipamentos[0]];
    if (!item) {
      return `Olá ${nomeCliente}! Daqui é a ENAT. A sua instalação está prestes a completar 1 ano. Recomendamos a revisão preventiva anual.`;
    }
    return `Olá ${nomeCliente}! Daqui é a ENAT.\n\nA instalação ${item.artigo} está prestes a completar 1 ano.\n\nPara garantir a sua máxima eficiência, ${item.beneficio} e manter as garantias de fábrica ativas, recomendamos a realização da revisão preventiva anual.\n\nPodemos agendar a visita para esta semana ou prefere na próxima? Responda a esta mensagem para combinarmos o dia.`;
  }

  // Múltiplos equipamentos
  const nomesArtigos = equipamentos.map(eq => CATALOGO_EQUIPAMENTOS[eq]?.artigo || eq);
  const textoArtigos = nomesArtigos.length === 2
    ? `${nomesArtigos[0]} e ${nomesArtigos[1]}`
    : `${nomesArtigos.slice(0, -1).join(", ")} e ${nomesArtigos[nomesArtigos.length - 1]}`;

  return `Olá ${nomeCliente}! Daqui é a ENAT.\n\nA instalação conjunta ${textoArtigos} está prestes a completar 1 ano de funcionamento.\n\nPara assegurar a máxima fiabilidade, manter a eficiência energética de todos os sistemas e salvaguardar as respetivas garantias de fábrica, recomendamos efetuar a revisão técnica preventiva.\n\nPodemos combinar a visita para esta semana ou na próxima? Responda a esta mensagem para definirmos a melhor data.`;
}
