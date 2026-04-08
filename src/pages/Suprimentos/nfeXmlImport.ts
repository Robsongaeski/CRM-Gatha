import { supabase } from '@/integrations/supabase/client';

const PROCUREMENT_ATTACHMENTS_BUCKET = 'procurement-attachments';

type ProcurementItemType = 'materia_prima' | 'produto_pronto' | 'servico' | 'custo_indireto';

export interface NfeXmlPreviewItem {
  code: string;
  name: string;
  quantity: number;
  purchaseUnit: string;
  unitsPerPurchase: number;
  unit: string;
  normalizedUnit: string;
  unitPrice: number;
  total: number;
  discount: number;
  ncm: string;
  cfop: string;
  categorySuggestion: string;
  itemTypeSuggestion: ProcurementItemType;
}

export interface NfeXmlPreviewData {
  invoiceNumber: string;
  series: string;
  issueDate: string;
  accessKey: string;
  supplier: {
    corporateName: string;
    tradeName: string;
    cnpj: string;
    stateRegistration: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  totals: {
    freight: number;
    insurance: number;
    taxes: number;
    otherCosts: number;
  };
  items: NfeXmlPreviewItem[];
}

export interface ImportedPurchaseResult {
  purchaseId: string;
  purchaseNumber: string;
  invoiceNumber: string;
  supplierName: string;
  warnings?: string[];
}

function normalizeDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

function parseMoney(value: string): number {
  if (!value) return 0;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateToIso(value: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);

  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch?.[1]) return isoMatch[1];

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;

  return new Date().toISOString().slice(0, 10);
}

function getText(node: ParentNode | null, selector: string): string {
  return node?.querySelector(selector)?.textContent?.trim() || '';
}

function normalizeUnit(unit: string): string {
  const raw = (unit || '').trim().toUpperCase();
  if (!raw) return 'un';

  const map: Record<string, string> = {
    UN: 'un',
    UND: 'un',
    UNID: 'un',
    PC: 'pc',
    PCS: 'pc',
    PCT: 'pc',
    PAR: 'par',
    KG: 'kg',
    KGS: 'kg',
    G: 'g',
    GR: 'g',
    L: 'l',
    LT: 'l',
    LTS: 'l',
    ML: 'ml',
    M: 'm',
    MT: 'm',
    MTS: 'm',
    CM: 'cm',
    ROLO: 'rolo',
    RL: 'rolo',
    CX: 'cx',
  };

  return map[raw] || raw.toLowerCase();
}

function inferCategoryAndType(item: { ncm: string; cfop: string; normalizedUnit: string; name: string }): { category: string; itemType: ProcurementItemType } {
  const ncm = normalizeDigits(item.ncm);
  const cfop = normalizeDigits(item.cfop);
  const name = (item.name || '').toLowerCase();

  // Regras iniciais de classificação por NCM e CFOP (podem ser evoluídas depois)
  if (name.includes('frete')) return { category: 'frete', itemType: 'custo_indireto' };
  if (name.includes('serviço') || name.includes('servico') || item.normalizedUnit === 'sv') {
    return { category: 'servico terceirizado', itemType: 'servico' };
  }

  if (ncm.startsWith('5807')) return { category: 'etiqueta', itemType: 'materia_prima' };
  if (ncm.startsWith('3923') || ncm.startsWith('4819')) return { category: 'embalagem', itemType: 'materia_prima' };
  if (ncm.startsWith('3204') || ncm.startsWith('3208') || ncm.startsWith('3215')) return { category: 'tinta', itemType: 'materia_prima' };

  if (
    ncm.startsWith('5204') ||
    ncm.startsWith('5205') ||
    ncm.startsWith('5206') ||
    ncm.startsWith('5207') ||
    ncm.startsWith('5401') ||
    ncm.startsWith('5402') ||
    ncm.startsWith('5508') ||
    ncm.startsWith('5509')
  ) {
    return { category: 'fio', itemType: 'materia_prima' };
  }

  if (
    ncm.startsWith('6001') ||
    ncm.startsWith('6002') ||
    ncm.startsWith('6003') ||
    ncm.startsWith('6004') ||
    ncm.startsWith('6005') ||
    ncm.startsWith('6006')
  ) {
    return { category: 'malha', itemType: 'materia_prima' };
  }

  if (
    ncm.startsWith('5208') ||
    ncm.startsWith('5209') ||
    ncm.startsWith('5210') ||
    ncm.startsWith('5211') ||
    ncm.startsWith('5212') ||
    ncm.startsWith('5407') ||
    ncm.startsWith('5408') ||
    ncm.startsWith('5512') ||
    ncm.startsWith('5513') ||
    ncm.startsWith('5514') ||
    ncm.startsWith('5515') ||
    ncm.startsWith('5516')
  ) {
    return { category: 'tecido pronto', itemType: 'materia_prima' };
  }

  if (cfop.startsWith('1933') || cfop.startsWith('2933') || cfop.startsWith('5933') || cfop.startsWith('6933')) {
    return { category: 'servico terceirizado', itemType: 'servico' };
  }

  return { category: 'outros', itemType: 'materia_prima' };
}

function sanitizeFileName(name: string): string {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'nota.xml';
}

function parseNfeXml(xmlContent: string): NfeXmlPreviewData {
  const sanitizedXml = xmlContent.replace(/xmlns(:\w+)?="[^"]*"/g, '');
  const doc = new DOMParser().parseFromString(sanitizedXml, 'text/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('Não foi possível ler o XML. Verifique se o arquivo é uma NF-e válida.');
  }

  const infNfe = doc.querySelector('NFe > infNFe, nfeProc > NFe > infNFe, infNFe');
  if (!infNfe) {
    throw new Error('XML sem estrutura de NF-e reconhecida (infNFe).');
  }

  const ide = infNfe.querySelector('ide');
  const emit = infNfe.querySelector('emit');
  const emitEnd = emit?.querySelector('enderEmit') || null;
  const total = infNfe.querySelector('total > ICMSTot');
  const detNodes = Array.from(infNfe.querySelectorAll('det'));

  if (!emit) throw new Error('XML sem dados do emitente (fornecedor).');
  if (detNodes.length === 0) throw new Error('XML sem itens de produto.');

  const items: NfeXmlPreviewItem[] = detNodes.map((det) => {
    const prod = det.querySelector('prod');
    if (!prod) throw new Error('XML possui item sem nó de produto (prod).');

    const quantity = parseMoney(getText(prod, 'qCom')) || 1;
    const unitPrice = parseMoney(getText(prod, 'vUnCom'));
    const totalValue = parseMoney(getText(prod, 'vProd'));
    const itemDiscount = parseMoney(getText(prod, 'vDesc'));
    const ncm = getText(prod, 'NCM');
    const cfop = getText(prod, 'CFOP');
    const unit = getText(prod, 'uCom') || 'un';
    const normalizedUnit = normalizeUnit(unit);
    const name = getText(prod, 'xProd') || 'Item sem descrição';
    const inferred = inferCategoryAndType({ ncm, cfop, normalizedUnit, name });

    return {
      code: getText(prod, 'cProd'),
      name,
      quantity,
      purchaseUnit: normalizedUnit,
      unitsPerPurchase: 1,
      unit,
      normalizedUnit,
      unitPrice,
      total: totalValue,
      discount: itemDiscount,
      ncm,
      cfop,
      categorySuggestion: inferred.category,
      itemTypeSuggestion: inferred.itemType,
    };
  });

  const headerDiscount = parseMoney(getText(total, 'vDesc'));
  const itemDiscountSum = items.reduce((sum, item) => sum + item.discount, 0);
  const itemTotalsSum = items.reduce((sum, item) => sum + item.total, 0);

  if (headerDiscount > 0 && itemDiscountSum === 0 && itemTotalsSum > 0) {
    for (const item of items) {
      const ratio = item.total / itemTotalsSum;
      item.discount = Number((headerDiscount * ratio).toFixed(4));
    }
  }

  const accessKeyRaw = infNfe.getAttribute('Id') || '';
  const accessKey = normalizeDigits(accessKeyRaw);

  return {
    invoiceNumber: getText(ide, 'nNF'),
    series: getText(ide, 'serie'),
    issueDate: parseDateToIso(getText(ide, 'dhEmi') || getText(ide, 'dEmi')),
    accessKey,
    supplier: {
      corporateName: getText(emit, 'xNome') || 'Fornecedor sem nome',
      tradeName: getText(emit, 'xFant'),
      cnpj: normalizeDigits(getText(emit, 'CNPJ') || getText(emit, 'CPF')),
      stateRegistration: getText(emit, 'IE'),
      phone: getText(emitEnd, 'fone'),
      email: getText(emit, 'email'),
      address: [getText(emitEnd, 'xLgr'), getText(emitEnd, 'nro'), getText(emitEnd, 'xBairro')]
        .filter(Boolean)
        .join(', '),
      city: getText(emitEnd, 'xMun'),
      state: getText(emitEnd, 'UF'),
      zipCode: getText(emitEnd, 'CEP'),
    },
    totals: {
      freight: parseMoney(getText(total, 'vFrete')),
      insurance: parseMoney(getText(total, 'vSeg')),
      taxes: parseMoney(getText(total, 'vST')) + parseMoney(getText(total, 'vIPI')) + parseMoney(getText(total, 'vII')),
      otherCosts: parseMoney(getText(total, 'vOutro')),
    },
    items,
  };
}

function validateImportFile(file: File) {
  if (!file) throw new Error('Selecione um arquivo XML.');
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Arquivo muito grande. O limite para importação é 10MB.');
  }
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'xml') {
    throw new Error('Arquivo inválido. Selecione um XML de NF-e.');
  }
}

export async function previewNfeXmlFile(file: File): Promise<NfeXmlPreviewData> {
  validateImportFile(file);
  const xmlContent = await file.text();
  return parseNfeXml(xmlContent);
}

async function findOrCreateSupplier(parsed: NfeXmlPreviewData): Promise<string> {
  const cnpj = parsed.supplier.cnpj;

  if (cnpj) {
    const { data: exactSupplier, error: exactError } = await supabase
      .from('suppliers' as any)
      .select('id')
      .eq('cnpj', cnpj)
      .maybeSingle();
    if (exactError) throw exactError;
    if (exactSupplier?.id) return exactSupplier.id;

    const { data: candidates, error: candidateError } = await supabase
      .from('suppliers' as any)
      .select('id, cnpj')
      .not('cnpj', 'is', null);
    if (candidateError) throw candidateError;

    const normalizedMatch = (candidates ?? []).find((item: any) => normalizeDigits(item.cnpj || '') === cnpj);
    if (normalizedMatch?.id) return normalizedMatch.id;
  }

  const { data: sameNameRows, error: sameNameError } = await supabase
    .from('suppliers' as any)
    .select('id')
    .eq('corporate_name', parsed.supplier.corporateName)
    .limit(1);
  if (sameNameError) throw sameNameError;
  if (sameNameRows?.[0]?.id) return sameNameRows[0].id;

  const supplierPayload = {
    corporate_name: parsed.supplier.corporateName,
    trade_name: parsed.supplier.tradeName || null,
    cnpj: parsed.supplier.cnpj || null,
    state_registration: parsed.supplier.stateRegistration || null,
    contact_name: null,
    phone: parsed.supplier.phone || null,
    whatsapp: parsed.supplier.phone || null,
    email: parsed.supplier.email || null,
    website: null,
    address: parsed.supplier.address || null,
    city: parsed.supplier.city || null,
    state: parsed.supplier.state || null,
    zip_code: parsed.supplier.zipCode || null,
    supplier_type: 'outros',
    status: 'active',
  };

  const { data: createdSupplier, error: createError } = await supabase
    .from('suppliers' as any)
    .insert(supplierPayload)
    .select('id')
    .single();
  if (createError) throw createError;

  return createdSupplier.id;
}

async function findOrCreateProducts(parsed: NfeXmlPreviewData): Promise<Map<number, string>> {
  const { data: products, error: productsError } = await supabase
    .from('purchase_products' as any)
    .select('id, internal_code, name, unit');
  if (productsError) throw productsError;

  const byCode = new Map<string, any>();
  const byName = new Map<string, any>();

  for (const product of products ?? []) {
    const internalCode = String(product.internal_code || '').trim();
    const name = String(product.name || '').trim().toLowerCase();
    if (internalCode) byCode.set(internalCode, product);
    if (name) byName.set(name, product);
  }

  const itemProductMap = new Map<number, string>();

  for (let index = 0; index < parsed.items.length; index += 1) {
    const item = parsed.items[index];
    const code = String(item.code || '').trim();
    const nameKey = String(item.name || '').trim().toLowerCase();

    let product = (code && byCode.get(code)) || byName.get(nameKey);

    if (!product) {
      const { data: created, error: createError } = await supabase
        .from('purchase_products' as any)
        .insert({
          internal_code: code || null,
          name: item.name,
          category: item.categorySuggestion || 'outros',
          unit: item.normalizedUnit || 'un',
          item_type: item.itemTypeSuggestion || 'materia_prima',
          status: 'active',
          notes: `Cadastro criado automaticamente via importação XML de NF-e. NCM: ${item.ncm || '-'} | CFOP: ${item.cfop || '-'}`,
        })
        .select('id, internal_code, name, unit')
        .single();
      if (createError) throw createError;
      product = created;

      const createdCode = String(created.internal_code || '').trim();
      const createdName = String(created.name || '').trim().toLowerCase();
      if (createdCode) byCode.set(createdCode, created);
      if (createdName) byName.set(createdName, created);
    }

    itemProductMap.set(index, product.id);
  }

  return itemProductMap;
}

async function upsertSupplierProducts(parsed: NfeXmlPreviewData, supplierId: string, itemProductMap: Map<number, string>) {
  const uniqueByProduct = new Map<string, { code: string; unitPrice: number; quantity: number }>();

  parsed.items.forEach((item, index) => {
    const productId = itemProductMap.get(index);
    if (!productId || uniqueByProduct.has(productId)) return;
    uniqueByProduct.set(productId, { code: item.code, unitPrice: item.unitPrice, quantity: item.quantity });
  });

  if (uniqueByProduct.size === 0) return;

  const rows = Array.from(uniqueByProduct.entries()).map(([productId, info]) => ({
    supplier_id: supplierId,
    product_id: productId,
    supplier_product_code: info.code || null,
    standard_price: info.unitPrice || null,
    minimum_quantity: info.quantity || null,
    is_preferred: false,
  }));

  const { error } = await supabase
    .from('supplier_products' as any)
    .upsert(rows, { onConflict: 'supplier_id,product_id' });
  if (error) throw error;
}

async function attachXmlToPurchase(purchaseId: string, file: File): Promise<void> {
  const safeName = sanitizeFileName(file.name);
  const filePath = `${purchaseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PROCUREMENT_ATTACHMENTS_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || 'application/xml',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { error: attachError } = await supabase
    .from('purchase_attachments' as any)
    .insert({
      purchase_id: purchaseId,
      file_name: file.name,
      file_url: filePath,
      file_type: file.type || 'application/xml',
      file_size: file.size,
      notes: 'XML da NF-e importado automaticamente.',
    });

  if (attachError) throw attachError;
}

export async function importPurchaseFromNfeXml(file: File, preParsed?: NfeXmlPreviewData): Promise<ImportedPurchaseResult> {
  validateImportFile(file);
  const parsed = preParsed || (await previewNfeXmlFile(file));
  const warnings: string[] = [];

  const supplierId = await findOrCreateSupplier(parsed);
  const itemProductMap = await findOrCreateProducts(parsed);

  const accessKeyInvoiceNumber = parsed.accessKey.length === 44 ? parsed.accessKey.substring(25, 34).replace(/^0+/, '') : '';
  const invoiceNumber = parsed.invoiceNumber || accessKeyInvoiceNumber || null;

  if (invoiceNumber) {
    const { data: existingRows, error: existingError } = await supabase
      .from('purchases' as any)
      .select('id, purchase_number')
      .eq('supplier_id', supplierId)
      .eq('invoice_number', invoiceNumber)
      .limit(1);
    if (existingError) throw existingError;
    if (existingRows?.[0]?.id) {
      throw new Error(`Esta NF-e já foi importada na compra ${existingRows[0].purchase_number}.`);
    }
  }

  const purchasePayload = {
    supplier_id: supplierId,
    purchase_type: 'nfe_xml',
    purchase_date: parsed.issueDate,
    invoice_date: parsed.issueDate,
    expected_delivery_date: null,
    actual_delivery_date: null,
    invoice_number: invoiceNumber,
    payment_terms: null,
    cost_center: null,
    status: 'issued',
    allocation_method: 'proportional_value',
    freight_total: parsed.totals.freight,
    insurance_total: parsed.totals.insurance,
    impostos_adicionais: parsed.totals.taxes,
    other_cost_total: parsed.totals.otherCosts,
    notes: `Importado automaticamente via XML NF-e${parsed.series ? ` | Série ${parsed.series}` : ''}${parsed.accessKey ? ` | Chave ${parsed.accessKey}` : ''}`,
  };

  const { data: createdPurchase, error: createPurchaseError } = await supabase
    .from('purchases' as any)
    .insert(purchasePayload)
    .select('id, purchase_number')
    .single();
  if (createPurchaseError) throw createPurchaseError;

  const purchaseItemsPayload = parsed.items.map((item, index) => {
    const purchaseQuantity = Number(item.quantity || 0);
    const unitsPerPurchase = Number(item.unitsPerPurchase || 1);
    const effectiveQuantity = Number((purchaseQuantity * unitsPerPurchase).toFixed(4));
    const grossTotal = Number(item.total || purchaseQuantity * Number(item.unitPrice || 0));
    const effectiveUnitPrice =
      effectiveQuantity > 0
        ? Number((grossTotal / effectiveQuantity).toFixed(6))
        : 0;

    const packInfo =
      unitsPerPurchase > 1
        ? ` | Compra por volume: ${purchaseQuantity} ${item.purchaseUnit || 'vol'} x ${unitsPerPurchase} ${item.normalizedUnit || 'un'}`
        : '';

    return {
      purchase_id: createdPurchase.id,
      product_id: itemProductMap.get(index),
      description: item.name,
      quantity: effectiveQuantity,
      purchase_quantity: purchaseQuantity,
      purchase_unit: item.purchaseUnit || item.unit || item.normalizedUnit || 'un',
      units_per_purchase: unitsPerPurchase,
      unit: item.normalizedUnit || item.unit || 'un',
      unit_price: effectiveUnitPrice,
      item_discount: item.discount || 0,
      line_order: index + 1,
      notes: `NCM: ${item.ncm || '-'} | CFOP: ${item.cfop || '-'}${packInfo}`,
    };
  });

  const { error: insertItemsError } = await supabase.from('purchase_items' as any).insert(purchaseItemsPayload);
  if (insertItemsError) throw insertItemsError;

  const { error: recalculateError } = await supabase.rpc('procurement_recalculate_purchase' as any, { p_purchase_id: createdPurchase.id });
  if (recalculateError) throw recalculateError;

  await upsertSupplierProducts(parsed, supplierId, itemProductMap);

  try {
    await attachXmlToPurchase(createdPurchase.id, file);
  } catch (error) {
    console.error('Falha ao anexar XML da NF-e na compra importada:', error);
    warnings.push('Compra criada, mas não foi possível anexar o XML automaticamente.');
  }

  return {
    purchaseId: createdPurchase.id,
    purchaseNumber: createdPurchase.purchase_number,
    invoiceNumber: invoiceNumber || '-',
    supplierName: parsed.supplier.corporateName,
    warnings,
  };
}
