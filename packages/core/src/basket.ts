import type { Unit } from './types.js';
import { consumptionUnits, weeksPerPurchase, type FamilyProfile, type Restriction } from './profile.js';

// Cesta base (SPEC §6). Cantidades de partida, editables por el usuario en la lista.

export type Category =
  | 'Lácteos y huevos'
  | 'Panadería y desayuno'
  | 'Despensa'
  | 'Conservas y salsas'
  | 'Aceites y condimentos'
  | 'Fruta y verdura'
  | 'Carne y pescado'
  | 'Congelados'
  | 'Bebidas'
  | 'Limpieza'
  | 'Higiene'
  | 'Bebé'
  | 'Mascotas';

export const CATEGORY_ORDER: Category[] = [
  'Fruta y verdura',
  'Lácteos y huevos',
  'Carne y pescado',
  'Panadería y desayuno',
  'Despensa',
  'Conservas y salsas',
  'Aceites y condimentos',
  'Congelados',
  'Bebidas',
  'Limpieza',
  'Higiene',
  'Bebé',
  'Mascotas',
];

export interface BasketItemDef {
  id: string;
  name: string;
  category: Category;
  /** Texto de búsqueda en las tiendas. */
  query: string;
  unit: Unit;
  /**
   * `uc`: cantidad semanal por unidad de consumo.
   * `household`: cantidad por hogar cada `periodWeeks` semanas.
   * `per_baby` / `per_adult`: cantidad semanal por bebé (0–3) o por adulto.
   */
  scope: 'uc' | 'household' | 'per_baby' | 'per_adult';
  base: number;
  periodWeeks?: number;
  /** Se perece en pocos días (afecta a ofertas, Fase 3). */
  perishable?: boolean;
  /** Condiciones para incluirlo. */
  when?: { baby?: boolean; kids?: boolean; adults?: boolean; dog?: boolean; cat?: boolean };
  /** Restricciones que lo excluyen. */
  excludedBy?: Restriction[];
  /** Variantes por restricción (nombre y búsqueda alternativos). */
  variants?: Partial<Record<Restriction, { name: string; query: string }>>;
  /** Palabras que descartan un producto al emparejar ("sin lactosa" para la leche normal). Vale una raíz: "cocid". */
  avoid?: string[];
  /** Palabras principales alternativas que deben aparecer en el nombre (sinónimos: "spaghetti"). */
  mainWords?: string[];
}

const MEAT: Restriction[] = ['vegetarian'];
const PORK: Restriction[] = ['vegetarian', 'halal'];

export const BASKET: BasketItemDef[] = [
  // Lácteos y huevos (leche 2,5 L · yogures 5 ud · huevos 6 ud · queso 150 g por UC y semana)
  { id: 'leche', name: 'Leche semidesnatada', category: 'Lácteos y huevos', query: 'leche semidesnatada', unit: 'l', scope: 'uc', base: 2.5, avoid: ['sin lactosa', 'cacao', 'batido', 'condensada', 'evaporada', 'polvo'],
    variants: { lactose_free: { name: 'Leche sin lactosa', query: 'leche semidesnatada sin lactosa' } } },
  { id: 'yogur-natural', name: 'Yogur natural', category: 'Lácteos y huevos', query: 'yogur natural', unit: 'ud', scope: 'uc', base: 3, perishable: true, avoid: ['griego', 'bebible', 'sin lactosa'],
    variants: { lactose_free: { name: 'Yogur natural sin lactosa', query: 'yogur natural sin lactosa' } } },
  { id: 'yogur-sabores', name: 'Yogur de sabores', category: 'Lácteos y huevos', query: 'yogur sabores', unit: 'ud', scope: 'uc', base: 2, perishable: true, avoid: ['bebible', 'sin lactosa'],
    variants: { lactose_free: { name: 'Yogur de sabores sin lactosa', query: 'yogur sin lactosa sabores' } } },
  { id: 'huevos', name: 'Huevos L', category: 'Lácteos y huevos', query: 'huevos L', unit: 'ud', scope: 'uc', base: 6, avoid: ['codorniz', 'chocolate', 'cocidos'] },
  { id: 'queso-tierno', name: 'Queso tierno', category: 'Lácteos y huevos', query: 'queso tierno', unit: 'kg', scope: 'uc', base: 0.1, avoid: ['rallado', 'untar'],
    variants: { lactose_free: { name: 'Queso sin lactosa', query: 'queso sin lactosa' } } },
  { id: 'queso-rallado', name: 'Queso rallado', category: 'Lácteos y huevos', query: 'queso rallado', unit: 'kg', scope: 'uc', base: 0.05, excludedBy: ['lactose_free'] },
  { id: 'mantequilla', name: 'Mantequilla', category: 'Lácteos y huevos', query: 'mantequilla', unit: 'kg', scope: 'household', base: 0.25, periodWeeks: 2, avoid: ['galletas', 'cacahuete'] },

  // Panadería y desayuno (pan 1 kg · cereales/galletas 250 g)
  { id: 'pan-barra', name: 'Pan barra', category: 'Panadería y desayuno', query: 'barra de pan', unit: 'kg', scope: 'uc', base: 0.6, perishable: true, avoid: ['rallado', 'congelad'],
    variants: { gluten_free: { name: 'Pan sin gluten', query: 'pan sin gluten' } } },
  { id: 'pan-molde', name: 'Pan de molde', category: 'Panadería y desayuno', query: 'pan de molde', unit: 'kg', scope: 'uc', base: 0.4,
    variants: { gluten_free: { name: 'Pan de molde sin gluten', query: 'pan de molde sin gluten' } } },
  { id: 'cereales', name: 'Cereales', category: 'Panadería y desayuno', query: 'cereales', unit: 'kg', scope: 'uc', base: 0.125, mainWords: ['cereales', 'copos', 'muesli'], avoid: ['barrita', 'galleta', 'snack', 'bifidus', 'yogur', 'leche', 'bebida', 'papilla'],
    variants: { gluten_free: { name: 'Cereales sin gluten', query: 'cereales sin gluten' } } },
  { id: 'galletas', name: 'Galletas', category: 'Panadería y desayuno', query: 'galletas maria', unit: 'kg', scope: 'uc', base: 0.125,
    variants: { gluten_free: { name: 'Galletas sin gluten', query: 'galletas sin gluten' } } },
  { id: 'cafe', name: 'Café molido', category: 'Panadería y desayuno', query: 'cafe molido', unit: 'kg', scope: 'household', base: 0.25, periodWeeks: 2, when: { adults: true }, avoid: ['capsulas', 'cápsulas', 'soluble'] },
  { id: 'cacao', name: 'Cacao soluble', category: 'Panadería y desayuno', query: 'cacao soluble', unit: 'kg', scope: 'household', base: 0.4, periodWeeks: 2, when: { kids: true } },
  { id: 'mermelada', name: 'Mermelada', category: 'Panadería y desayuno', query: 'mermelada fresa', unit: 'kg', scope: 'household', base: 0.35, periodWeeks: 4 },

  // Despensa (pasta 300 g · arroz 300 g · legumbres 250 g)
  { id: 'macarrones', name: 'Macarrones', category: 'Despensa', query: 'macarrones', unit: 'kg', scope: 'uc', base: 0.15,
    variants: { gluten_free: { name: 'Macarrones sin gluten', query: 'macarrones sin gluten' } } },
  { id: 'espaguetis', name: 'Espaguetis', category: 'Despensa', query: 'espaguetis', unit: 'kg', scope: 'uc', base: 0.15, mainWords: ['espaguetis', 'spaghetti'],
    variants: { gluten_free: { name: 'Espaguetis sin gluten', query: 'espaguetis sin gluten' } } },
  { id: 'arroz', name: 'Arroz redondo', category: 'Despensa', query: 'arroz redondo', unit: 'kg', scope: 'uc', base: 0.3, avoid: ['vasito', 'microondas', 'integral'] },
  { id: 'lentejas', name: 'Lentejas', category: 'Despensa', query: 'lentejas', unit: 'kg', scope: 'uc', base: 0.125, avoid: ['cocid', 'guiso', 'jardinera', 'riojana', 'chorizo', 'crema', 'papilla', 'snack', 'pasta', 'listo'] },
  { id: 'garbanzos', name: 'Garbanzos', category: 'Despensa', query: 'garbanzos', unit: 'kg', scope: 'uc', base: 0.125, avoid: ['cocid', 'hummus', 'jardinera', 'riojana', 'espinaca', 'congelad', 'crema', 'snack', 'pasta', 'listo', 'callos'] },
  { id: 'harina', name: 'Harina de trigo', category: 'Despensa', query: 'harina de trigo', unit: 'kg', scope: 'household', base: 1, periodWeeks: 4,
    variants: { gluten_free: { name: 'Harina sin gluten', query: 'harina sin gluten' } } },
  { id: 'azucar', name: 'Azúcar', category: 'Despensa', query: 'azucar blanco', unit: 'kg', scope: 'household', base: 1, periodWeeks: 4, avoid: ['glas', 'moreno'] },
  { id: 'sal', name: 'Sal', category: 'Despensa', query: 'sal fina', unit: 'kg', scope: 'household', base: 1, periodWeeks: 8 },

  // Conservas y salsas
  { id: 'atun', name: 'Atún en aceite', category: 'Conservas y salsas', query: 'atun en aceite de girasol', unit: 'kg', scope: 'uc', base: 0.08, excludedBy: MEAT },
  { id: 'tomate-frito', name: 'Tomate frito', category: 'Conservas y salsas', query: 'tomate frito', unit: 'kg', scope: 'uc', base: 0.1 },
  { id: 'tomate-triturado', name: 'Tomate triturado', category: 'Conservas y salsas', query: 'tomate triturado', unit: 'kg', scope: 'uc', base: 0.4 },
  { id: 'maiz', name: 'Maíz dulce', category: 'Conservas y salsas', query: 'maiz dulce', unit: 'kg', scope: 'household', base: 0.3, periodWeeks: 2 },
  { id: 'aceitunas', name: 'Aceitunas', category: 'Conservas y salsas', query: 'aceitunas manzanilla', unit: 'kg', scope: 'household', base: 0.3, periodWeeks: 2 },

  // Aceites y condimentos (aceite de oliva 0,25 L)
  { id: 'aove', name: 'Aceite de oliva virgen extra', category: 'Aceites y condimentos', query: 'aceite de oliva virgen extra', unit: 'l', scope: 'uc', base: 0.25 },
  { id: 'girasol', name: 'Aceite de girasol', category: 'Aceites y condimentos', query: 'aceite de girasol', unit: 'l', scope: 'household', base: 1, periodWeeks: 4, avoid: ['atun', 'atún'] },
  { id: 'vinagre', name: 'Vinagre', category: 'Aceites y condimentos', query: 'vinagre de vino', unit: 'l', scope: 'household', base: 0.5, periodWeeks: 8 },
  { id: 'pimienta', name: 'Pimienta negra molida', category: 'Aceites y condimentos', query: 'pimienta negra molida', unit: 'kg', scope: 'household', base: 0.05, periodWeeks: 8 },

  // Fruta y verdura (fruta 2 kg · verdura 2 kg · patatas 1 kg)
  { id: 'platano', name: 'Plátano', category: 'Fruta y verdura', query: 'platano', unit: 'kg', scope: 'uc', base: 0.7, perishable: true, mainWords: ['platano', 'banana'], avoid: ['chips', 'deshidratado', 'pure'] },
  { id: 'manzana', name: 'Manzana', category: 'Fruta y verdura', query: 'manzana', unit: 'kg', scope: 'uc', base: 0.7, perishable: true, avoid: ['zumo', 'compota', 'tarta'] },
  { id: 'naranja', name: 'Naranja', category: 'Fruta y verdura', query: 'naranja', unit: 'kg', scope: 'uc', base: 0.6, perishable: true, avoid: ['zumo', 'refresco'] },
  { id: 'tomate', name: 'Tomate', category: 'Fruta y verdura', query: 'tomate', unit: 'kg', scope: 'uc', base: 0.5, perishable: true, avoid: ['frito', 'triturado', 'troceado', 'pelado', 'ketchup', 'seco', 'zumo', 'gazpacho'] },
  { id: 'lechuga', name: 'Lechuga', category: 'Fruta y verdura', query: 'lechuga', unit: 'ud', scope: 'uc', base: 0.5, perishable: true },
  { id: 'cebolla', name: 'Cebolla', category: 'Fruta y verdura', query: 'cebolla', unit: 'kg', scope: 'uc', base: 0.4, perishable: true, avoid: ['frita', 'crujiente'] },
  { id: 'zanahoria', name: 'Zanahoria', category: 'Fruta y verdura', query: 'zanahoria', unit: 'kg', scope: 'uc', base: 0.3, perishable: true, avoid: ['rallada'] },
  { id: 'pimiento', name: 'Pimiento', category: 'Fruta y verdura', query: 'pimiento', unit: 'kg', scope: 'uc', base: 0.3, perishable: true, avoid: ['asado', 'piquillo', 'pimentón'] },
  { id: 'calabacin', name: 'Calabacín', category: 'Fruta y verdura', query: 'calabacin', unit: 'kg', scope: 'uc', base: 0.3, perishable: true, avoid: ['crema'] },
  { id: 'patata', name: 'Patatas', category: 'Fruta y verdura', query: 'patatas', unit: 'kg', scope: 'uc', base: 1, perishable: true, avoid: ['fritas', 'chips', 'congelad', 'tortilla'] },

  // Carne y pescado (pollo 400 g · carne 300 g · pescado 350 g · embutido 100 g)
  { id: 'pechuga', name: 'Pechuga de pollo', category: 'Carne y pescado', query: 'pechuga de pollo', unit: 'kg', scope: 'uc', base: 0.25, perishable: true, excludedBy: MEAT, avoid: ['empanad', 'cocida', 'loncha'] },
  { id: 'muslos', name: 'Muslos de pollo', category: 'Carne y pescado', query: 'muslos de pollo', unit: 'kg', scope: 'uc', base: 0.15, perishable: true, excludedBy: MEAT },
  { id: 'carne-picada', name: 'Carne picada', category: 'Carne y pescado', query: 'carne picada mixta', unit: 'kg', scope: 'uc', base: 0.15, perishable: true, excludedBy: MEAT, mainWords: ['picada'],
    variants: { halal: { name: 'Carne picada de vacuno', query: 'carne picada vacuno' } } },
  { id: 'lomo', name: 'Lomo de cerdo', category: 'Carne y pescado', query: 'lomo de cerdo filetes', unit: 'kg', scope: 'uc', base: 0.15, perishable: true, excludedBy: PORK, avoid: ['embuchado', 'adobado'] },
  { id: 'merluza', name: 'Merluza congelada', category: 'Carne y pescado', query: 'merluza congelada', unit: 'kg', scope: 'uc', base: 0.35, excludedBy: MEAT, mainWords: ['merluza'], avoid: ['rebozad', 'empanad', 'varitas', 'palitos', 'fingers', 'romana', 'croqueta', 'hamburguesa', 'surimi', 'huevo', 'salsa'] },
  { id: 'jamon-cocido', name: 'Jamón cocido', category: 'Carne y pescado', query: 'jamon cocido lonchas', unit: 'kg', scope: 'uc', base: 0.05, perishable: true, excludedBy: PORK },
  { id: 'pavo', name: 'Pechuga de pavo', category: 'Carne y pescado', query: 'pechuga de pavo lonchas', unit: 'kg', scope: 'uc', base: 0.05, perishable: true, excludedBy: MEAT },
  { id: 'tofu', name: 'Tofu', category: 'Carne y pescado', query: 'tofu', unit: 'kg', scope: 'uc', base: 0.2, perishable: true },
  { id: 'hamburguesa-vegetal', name: 'Hamburguesa vegetal', category: 'Carne y pescado', query: 'hamburguesa vegetal', unit: 'kg', scope: 'uc', base: 0.15, perishable: true },

  // Congelados
  { id: 'verdura-congelada', name: 'Verdura congelada', category: 'Congelados', query: 'menestra de verduras congelada', unit: 'kg', scope: 'uc', base: 0.25 },
  { id: 'pizza', name: 'Pizza congelada', category: 'Congelados', query: 'pizza congelada', unit: 'ud', scope: 'household', base: 1, periodWeeks: 1, avoid: ['masa', 'base'],
    variants: { gluten_free: { name: 'Pizza sin gluten', query: 'pizza sin gluten' } } },
  { id: 'croquetas', name: 'Croquetas', category: 'Congelados', query: 'croquetas congeladas', unit: 'kg', scope: 'household', base: 0.5, periodWeeks: 2, excludedBy: ['gluten_free', 'vegetarian'] },
  { id: 'helado', name: 'Helado', category: 'Congelados', query: 'helado tarrina', unit: 'l', scope: 'household', base: 1, periodWeeks: 2 },

  // Bebidas (agua 6 L · zumo 0,5 L)
  { id: 'agua', name: 'Agua mineral', category: 'Bebidas', query: 'agua mineral garrafa', unit: 'l', scope: 'uc', base: 6, avoid: ['gas', 'sabor'] },
  { id: 'zumo', name: 'Zumo', category: 'Bebidas', query: 'zumo de naranja', unit: 'l', scope: 'uc', base: 0.5, avoid: ['exprimido', 'bebida'] },
  { id: 'refresco', name: 'Refresco de cola', category: 'Bebidas', query: 'refresco de cola', unit: 'l', scope: 'household', base: 2, periodWeeks: 1, avoid: ['zero', 'light'] },
  { id: 'cerveza', name: 'Cerveza', category: 'Bebidas', query: 'cerveza lata pack', unit: 'l', scope: 'per_adult', base: 1, excludedBy: ['halal'], avoid: ['sin alcohol', '0,0', 'radler'] },

  // Limpieza (por hogar)
  { id: 'detergente', name: 'Detergente lavadora', category: 'Limpieza', query: 'detergente liquido lavadora', unit: 'l', scope: 'household', base: 2, periodWeeks: 4, avoid: ['suavizante'] },
  { id: 'lavavajillas', name: 'Lavavajillas a mano', category: 'Limpieza', query: 'lavavajillas mano', unit: 'l', scope: 'household', base: 0.75, periodWeeks: 4, avoid: ['pastillas', 'capsulas'] },
  { id: 'friegasuelos', name: 'Friegasuelos', category: 'Limpieza', query: 'friegasuelos', unit: 'l', scope: 'household', base: 1.5, periodWeeks: 4 },
  { id: 'lejia', name: 'Lejía', category: 'Limpieza', query: 'lejia', unit: 'l', scope: 'household', base: 2, periodWeeks: 4 },
  { id: 'papel-cocina', name: 'Papel de cocina', category: 'Limpieza', query: 'papel de cocina rollos', unit: 'ud', scope: 'household', base: 2, periodWeeks: 2 },
  { id: 'bolsas-basura', name: 'Bolsas de basura', category: 'Limpieza', query: 'bolsas de basura', unit: 'ud', scope: 'household', base: 30, periodWeeks: 4 },

  // Higiene (por hogar)
  { id: 'papel-higienico', name: 'Papel higiénico', category: 'Higiene', query: 'papel higienico', unit: 'ud', scope: 'uc', base: 3, avoid: ['humedo', 'húmedo'] },
  { id: 'gel', name: 'Gel de ducha', category: 'Higiene', query: 'gel de ducha', unit: 'l', scope: 'household', base: 0.75, periodWeeks: 4 },
  { id: 'champu', name: 'Champú', category: 'Higiene', query: 'champu', unit: 'l', scope: 'household', base: 0.4, periodWeeks: 4 },
  { id: 'pasta-dientes', name: 'Pasta de dientes', category: 'Higiene', query: 'pasta de dientes', unit: 'l', scope: 'household', base: 0.075, periodWeeks: 4, avoid: ['cepillo'] },
  { id: 'desodorante', name: 'Desodorante', category: 'Higiene', query: 'desodorante', unit: 'l', scope: 'household', base: 0.2, periodWeeks: 4 },

  // Bebé (si hay alguien de 0–3)
  { id: 'panales', name: 'Pañales', category: 'Bebé', query: 'pañales talla 4', unit: 'ud', scope: 'per_baby', base: 40, when: { baby: true } },
  { id: 'toallitas', name: 'Toallitas', category: 'Bebé', query: 'toallitas bebe', unit: 'ud', scope: 'per_baby', base: 80, when: { baby: true } },
  { id: 'leche-infantil', name: 'Leche infantil', category: 'Bebé', query: 'leche infantil continuacion', unit: 'kg', scope: 'per_baby', base: 0.8, when: { baby: true } },
  { id: 'potitos', name: 'Potitos', category: 'Bebé', query: 'potito', unit: 'kg', scope: 'per_baby', base: 1.4, when: { baby: true } },

  // Mascotas
  { id: 'pienso-perro', name: 'Pienso para perro', category: 'Mascotas', query: 'pienso perro adulto', unit: 'kg', scope: 'household', base: 3, periodWeeks: 2, when: { dog: true } },
  { id: 'pienso-gato', name: 'Pienso para gato', category: 'Mascotas', query: 'pienso gato adulto', unit: 'kg', scope: 'household', base: 1.5, periodWeeks: 2, when: { cat: true } },
];

/** Un artículo de la lista de la compra del usuario. */
export interface ListItem {
  id: string;
  /** Genérico de la cesta base del que procede (null si lo añadió el usuario). */
  defId: string | null;
  name: string;
  category: Category | 'Otros';
  query: string;
  /** Cantidad necesaria para el periodo, en `unit`. */
  qty: number;
  unit: Unit;
  /** Marca concreta exigida por el usuario. */
  brand?: string;
  avoid?: string[];
  mainWords?: string[];
  perishable?: boolean;
  /** Incluido en la compra. Los de reposición larga salen desmarcados. */
  checked: boolean;
  /** Se repone cada más tiempo que la frecuencia de compra. */
  restock?: boolean;
}

const VEGETARIAN_ONLY = new Set(['tofu', 'hamburguesa-vegetal']);

function roundQty(qty: number, unit: Unit): number {
  if (unit === 'ud') return Math.max(1, Math.round(qty));
  return Math.round(qty * 100) / 100;
}

/** Genera la cesta base a partir del perfil (SPEC §6). */
export function generateBasket(profile: FamilyProfile, catalog: BasketItemDef[] = BASKET): ListItem[] {
  const uc = consumptionUnits(profile.members);
  const weeks = weeksPerPurchase(profile.frequency);
  const babies = profile.members.filter((m) => m === '0-3').length;
  const kids = profile.members.filter((m) => m === '4-11' || m === '12-17').length;
  const adults = profile.members.filter((m) => m === 'adult' || m === '65+').length;
  const r = new Set(profile.restrictions);
  const items: ListItem[] = [];

  for (const def of catalog) {
    if (def.when?.baby && babies === 0) continue;
    if (def.when?.kids && kids === 0) continue;
    if (def.when?.adults && adults === 0) continue;
    if (def.when?.dog && !profile.pets.dog) continue;
    if (def.when?.cat && !profile.pets.cat) continue;
    if (def.excludedBy?.some((x) => r.has(x))) continue;
    if (VEGETARIAN_ONLY.has(def.id) && !r.has('vegetarian')) continue;

    let name = def.name;
    let query = def.query;
    for (const restriction of profile.restrictions) {
      const v = def.variants?.[restriction];
      if (v) {
        name = v.name;
        query = v.query;
      }
    }

    let qty: number;
    let restock = false;
    switch (def.scope) {
      case 'uc':
        qty = def.base * uc * weeks;
        break;
      case 'per_baby':
        qty = def.base * babies * weeks;
        break;
      case 'per_adult':
        qty = def.base * adults * weeks;
        break;
      case 'household': {
        const period = def.periodWeeks ?? 1;
        // Si se repone cada más tiempo que la compra, se propone la cantidad del periodo pero desmarcada.
        restock = period > weeks;
        qty = restock ? def.base : def.base * (weeks / period);
        break;
      }
    }
    if (qty <= 0) continue;

    items.push({
      id: def.id,
      defId: def.id,
      name,
      category: def.category,
      query,
      qty: roundQty(qty, def.unit),
      unit: def.unit,
      avoid: name === def.name ? def.avoid : def.avoid?.filter((w) => !query.includes(w)),
      mainWords: def.mainWords,
      perishable: def.perishable,
      checked: !restock,
      restock: restock || undefined,
    });
  }
  return items;
}
