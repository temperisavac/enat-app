/**
 * Category Classifier for Materials and Equipment
 * Enforces intelligent Portuguese HVAC, Plumbing, Electrical, and Construction categorization:
 * - Buchas, abraçadeiras, parafusos, porcas, fitas, colas -> 'Acessórios & Fixação'
 * - Tubo xpto, multicamada, pvc, cobre, pex, curvas, válvulas -> 'Canalização & Tubagens'
 * - Cabos, fios, disjuntores, diferenciais, quadros elétricos -> 'Material Elétrico'
 * - Bombas de calor, inversor, VMC, ar condicionado, ventiloconvectores -> 'Máquinas & Equipamentos'
 */

import { MaterialCategory } from '../types';

export function classifyMaterialCategory(nameOrDesc: string, fallbackCategory?: string): MaterialCategory {
  if (!nameOrDesc || typeof nameOrDesc !== 'string') {
    return (fallbackCategory as MaterialCategory) || 'Outros';
  }

  const s = nameOrDesc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. MÁQUINAS & EQUIPAMENTOS (High Priority)
  // Bombas de calor, inversores, vmc, ar condicionado, ventiloconvectores, caldeiras, depósitos, marcas e modelos AVAC
  const equipamentosRegex = /\b(bomba\s*de?\s*calor|bomba\s*calor|inversor|microinversor|vmc|ar\s*condicionado|ar\s*cond\b|ar\s*condicionado\b|unidade\s*exterior|unidade\s*interior|unid\s*ext\b|unid\s*int\b|mural|mono\s*split|multisplit|multi-split|split\b|splits\b|conduta|ventiloconvector|ventiloconvectores|ventiloconvectora|cassete|termoacumulador|cilindro|deposito\s*(de\s*)?(aqs|agua|inercia)|deposito|painel\s*solar|paineis\s*solares|modulo\s*fotovoltaico|modulo\s*solar|aerotermia|recuperador\s*de?\s*calor|recuperador|caldeira|chiller|ventilador\s*centrifugo|extrator\s*de?\s*ar|desumidificador|grupo\s*termico|grupo\s*hidraulico|permutador|bateria\s*de\s*litio|baterias?\s*(solar|acumulacao)|mitsubishi|daikin|panasonic|haier|baxi|ariston|vaillant|daitsu|gree|midea|toshiba|hitachi|carrier|fujitsu|vulcano|junkers|atlantic|ecodan|altherma|aquarea|therma\s*v|msz|muz|mxz|mfz|ftx)\b/;
  if (equipamentosRegex.test(s)) {
    return 'Máquinas & Equipamentos';
  }

  // 2. ACESSÓRIOS & FIXAÇÃO
  // Buchas, abraçadeiras, parafusos, porcas, anilhas, varão roscado, colas, silicones, suportes
  const fixacaoRegex = /\b(bucha|buchas|abracadeira|abracadeiras|abrac|parafuso|parafusos|porca|porcas|anilha|anilhas|varao|varao\s*roscado|fita\s*cola|fita\s*isoladora|fita\s*aluminio|fita\s*adesiva|fita\s*teflon|teflon|cola\s*veda|cola-veda|silicone|massa\s*refrataria|espuma\s*pu|espuma\s*poliuretano|suporte\s*mural|suporte\s*chao|suporte\s*para|amortecedor|amortecedores|silentblock|silent\s*blocks|cantoneira|taco|tacos|rebite|rebites|grampo|grampos|gancho|ganchos|perfil\s*omega|calha\s*de\s*fixacao|bracadeira|bracadeiras)\b/;
  if (fixacaoRegex.test(s)) {
    return 'Acessórios & Fixação';
  }

  // 3. CANALIZAÇÃO & TUBAGENS
  // Tubos (multicamada, pex, pvc, cobre, esgoto), curvas, tês, casquilhos, válvulas, passadores
  const canalizacaoRegex = /\b(tubo|tubos|tubagem|multicamada|pex|pvc|cobre|esgoto|ppr|pp-r|polietileno|pead|curva|joelho|te\b|uniao|casquilho|valvula|passador|torneira|coletor|caixa\s*coletora|sifao|ralo|filtro\s*de?\s*agua|purgador|redutora\s*de?\s*pressao|manometro|vaso\s*de?\s*expansao|vaso\s*expansao|coquilha|isolamento\s*termico|armacell|kaiflex|racord|flange|manga|bicha\s*flexivel|valvula\s*seguranca|valvula\s*retencao|fluxostato|pressostato)\b/;
  if (canalizacaoRegex.test(s)) {
    return 'Canalização & Tubagens';
  }

  // 4. MATERIAL ELÉTRICO
  // Cabos, fios, disjuntores, diferenciais, quadros elétricos, interruptores, tomadas, ligadores
  const eletricoRegex = /\b(cabo|cabos|fio|fios|disjuntor|disjuntores|diferencial|diferenciais|quadro\s*eletrico|interruptor|interruptores|tomada|tomadas|bornes?|barramento|tubo\s*corrugado|tubo\s*vd|corrugado|vd\s*20|vd\s*25|vd\s*16|anelado|contador\s*eletrico|rele|contactor|fusivel|ligador|ligadores|wago|ponteira|ponteiras|terminais|ficha\s*macho|ficha\s*femea|transformador|fita\s*led|foco\s*led|projetor|balastro|condensador\s*eletrico)\b/;
  if (eletricoRegex.test(s)) {
    return 'Material Elétrico';
  }

  // 5. FERRAMENTAS & EQUIPAMENTO DE TRABALHO
  const ferramentasRegex = /\b(alicate|chave\s*de\s*fendas|chave\s*inglesa|berbequim|rebarbadora|bomba\s*de\s*vacuo|manifold|balanca|macarico|disco\s*de\s*corte|broca|brocas|escada|nivel\s*laser|manometro\s*digital)\b/;
  if (ferramentasRegex.test(s)) {
    return 'Ferramentas & Equipamento';
  }

  // 6. CONSTRUÇÃO CIVIL
  const construcaoRegex = /\b(cimento|argamassa|gesso|pladur|tijolo|areia|cola\s*azulejo|reboco|tinta|primario|massa\s*de\s*juntas)\b/;
  if (construcaoRegex.test(s)) {
    return 'Construção Civil';
  }

  // 7. COMBUSTÍVEL & TRANSPORTE
  const combustivelRegex = /\b(gasoleo|gasolina|combustivel|via\s*verde|portagem|estacionamento)\b/;
  if (combustivelRegex.test(s)) {
    return 'Combustível & Transporte';
  }

  // 8. REFEIÇÕES & ESTADIA
  const refeicoesRegex = /\b(almoco|jantar|refeicao|cafe|pequeno\s*almoco|hotel|alojamento|dormida)\b/;
  if (refeicoesRegex.test(s)) {
    return 'Refeições & Estadia';
  }

  // If already matches a valid category directly
  if (fallbackCategory && fallbackCategory !== 'Outros') {
    return fallbackCategory as MaterialCategory;
  }

  return 'Outros';
}
