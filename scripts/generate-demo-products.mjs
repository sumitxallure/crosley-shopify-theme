import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'data', 'crosley-demo-products.csv');
const mediaManifestPath = resolve(root, 'data', 'crosley-demo-media.json');
const sourceAssetRoot = 'C:/Users/Lenovo/Downloads/Crosley Radio_4';

const headers = [
  'Title',
  'URL handle',
  'Description',
  'Vendor',
  'Product category',
  'Type',
  'Tags',
  'Published on online store',
  'Status',
  'SKU',
  'Variant Barcodes',
  'Option1 name',
  'Option1 value',
  'Option1 Linked To',
  'Option2 name',
  'Option2 value',
  'Option2 Linked To',
  'Option3 name',
  'Option3 value',
  'Option3 Linked To',
  'Price',
  'Compare-at price',
  'Cost per item',
  'Charge tax',
  'Tax code',
  'Unit price total measure',
  'Unit price total measure unit',
  'Unit price base measure',
  'Unit price base measure unit',
  'Inventory tracker',
  'Inventory quantity',
  'Continue selling when out of stock',
  'Weight value (grams)',
  'Weight unit for display',
  'Requires shipping',
  'Fulfillment service',
  'Product image URL',
  'Image position',
  'Image alt text',
  'Variant image URL',
  'Gift card',
  'SEO title',
  'SEO description',
  'Color (product.metafields.shopify.color-pattern)',
  'Google Shopping / Google product category',
  'Google Shopping / Gender',
  'Google Shopping / Age group',
  'Google Shopping / Manufacturer part number (MPN)',
  'Google Shopping / Ad group name',
  'Google Shopping / Ads labels',
  'Google Shopping / Condition',
  'Google Shopping / Custom product',
  'Google Shopping / Custom label 0',
  'Google Shopping / Custom label 1',
  'Google Shopping / Custom label 2',
  'Google Shopping / Custom label 3',
  'Google Shopping / Custom label 4',
  'Packed product length',
  'Packed product width',
  'Packed product height',
  'Packed product dimension unit',
];

const products = [
  {
    handle: 'zodiac-cruiser-plus-record-player',
    title: 'Zodiac Cruiser Plus Record Player',
    description: 'A portable suitcase-style record player with built-in speakers and Bluetooth connectivity.',
    type: 'Record Player',
    tags: ['crosley-demo', 'record-player', 'best-seller'],
    image: 'cp8005flib-te-w1-zodiac-front.webp',
    weight: 2495,
    variants: [
      { color: 'Taupe', sku: 'CR-ZOD-TAUPE', price: 109, inventory: 18 },
      { color: 'Black', sku: 'CR-ZOD-BLACK', price: 109, inventory: 12 },
      { color: 'Cream', sku: 'CR-ZOD-CREAM', price: 109, inventory: 8 },
    ],
  },
  {
    handle: 'c6-record-player',
    title: 'C6 Record Player',
    description: 'A clean, modern turntable designed for simple listening and easy connection to external speakers.',
    type: 'Record Player',
    tags: ['crosley-demo', 'record-player', 'new-arrival'],
    image: 'cr6238a-wa-w2-front.webp',
    weight: 4535,
    variants: [
      { color: 'Walnut', sku: 'CR-C6-WALNUT', price: 199, inventory: 10 },
      { color: 'Black', sku: 'CR-C6-BLACK', price: 199, inventory: 7 },
    ],
  },
  {
    handle: 'nash-7-in-1-record-player',
    title: 'Nash 7-in-1 Record Player',
    description: 'A versatile entertainment center combining vinyl playback with radio, CD, cassette, and Bluetooth features.',
    type: 'Record Player',
    tags: ['crosley-demo', 'record-player', 'new-arrival'],
    image: 'cr6051a-ab-w2-front.webp',
    weight: 6800,
    variants: [
      { color: 'Acorn', sku: 'CR-NASH-ACORN', price: 219, inventory: 6 },
      { color: 'Black', sku: 'CR-NASH-BLACK', price: 219, inventory: 4 },
    ],
  },
  {
    handle: 'cruiser-plus-record-player',
    title: 'Cruiser Plus Record Player',
    description: 'A compact portable record player with built-in speakers and a classic suitcase-inspired design.',
    type: 'Record Player',
    tags: ['crosley-demo', 'record-player', 'best-seller'],
    image: 'cr6038b-wa-w11_1-msh9alqx-lcox.webp',
    weight: 2495,
    variants: [
      { color: 'Walnut', sku: 'CR-CRUISER-WALNUT', price: 79.99, compareAt: 99, inventory: 14 },
      { color: 'Red', sku: 'CR-CRUISER-RED', price: 79.99, compareAt: 99, inventory: 2 },
    ],
  },
  {
    handle: 'voyager-turntable',
    title: 'Voyager Turntable',
    description: 'A streamlined portable turntable with three-speed playback and wireless audio connectivity.',
    type: 'Record Player',
    tags: ['crosley-demo', 'record-player'],
    image: 'kt300a-bk-w9-front.webp',
    weight: 2720,
    variants: [{ color: 'Black', sku: 'CR-VOYAGER-BLACK', price: 149, inventory: 9 }],
  },
  {
    handle: 'c62-record-player-with-speakers',
    title: 'C62 Record Player With Speakers',
    description: 'A complete turntable system paired with matching external speakers for room-filling sound.',
    type: 'Turntable System',
    tags: ['crosley-demo', 'record-player', 'speaker', 'best-seller'],
    image: 'c92a-bk-w1-v3.webp',
    weight: 9070,
    variants: [{ color: 'Black', sku: 'CR-C62-BLACK', price: 299, inventory: 5 }],
  },
  {
    handle: 'dansette-bermuda-record-player',
    title: 'Dansette Bermuda Record Player',
    description: 'A mid-century-inspired record player on tapered legs with an integrated speaker cabinet.',
    type: 'Record Player',
    tags: ['crosley-demo', 'record-player', 'clearance'],
    image: 'cr6046a-wamh-w2-front.webp',
    weight: 8165,
    variants: [
      { color: 'Walnut', sku: 'CR-DANSETTE-WALNUT', price: 179.97, compareAt: 249, inventory: 3 },
      { color: 'Red', sku: 'CR-DANSETTE-RED', price: 179.97, compareAt: 249, inventory: 0 },
    ],
  },
  {
    handle: 'cadence-cube-bluetooth-speaker',
    title: 'Cadence Cube Bluetooth Speaker',
    description: 'A compact Bluetooth speaker with retro Crosley styling for everyday wireless listening.',
    type: 'Speaker',
    tags: ['crosley-demo', 'speaker', 'new-arrival'],
    image: 'c6c-lm-w2-yellow-front.webp',
    weight: 1360,
    variants: [{ color: 'Lemon Yellow', sku: 'CR-CADENCE-YELLOW', price: 89, inventory: 11 }],
  },
  {
    handle: '1950s-payphone',
    title: '1950s Payphone',
    description: 'A functional telephone inspired by classic 1950s public payphones and finished with nostalgic details.',
    type: 'Telephone',
    tags: ['crosley-demo', 'radio-phone'],
    image: 'phone-main_1-msh96qed-7ory.webp',
    weight: 3628,
    variants: [{ color: 'Black', sku: 'CR-PAYPHONE-BLACK', price: 99, inventory: 0 }],
  },
  {
    handle: 'skylar-record-player-cabinet',
    title: 'Skylar Record Player Cabinet',
    description: 'A compact record-player cabinet with dedicated vinyl storage and a warm retro profile.',
    type: 'Furniture',
    tags: ['crosley-demo', 'furniture', 'new-arrival'],
    image: 'cr6047a-re-e2-msh8rmwo-thwn.webp',
    weight: 18140,
    variants: [{ color: 'Red', sku: 'CR-SKYLAR-RED', price: 249, inventory: 4 }],
  },
  {
    handle: 'five-in-one-record-care-set',
    title: '5-in-1 Record Care Set',
    description: 'A practical record-care bundle for cleaning vinyl, maintaining styluses, and organizing everyday accessories.',
    type: 'Accessory',
    tags: ['crosley-demo', 'accessory'],
    image: 'ac1024a-5in1-set-front.webp',
    weight: 680,
    variants: [{ color: 'Default Title', sku: 'CR-CARE-5IN1', price: 39.95, inventory: 20 }],
  },
  {
    handle: 'record-player-cleaning-kit',
    title: 'Record Player Cleaning Kit',
    description: 'Essential tools for removing dust and keeping records and playback equipment ready to perform.',
    type: 'Accessory',
    tags: ['crosley-demo', 'accessory', 'best-seller'],
    image: 'ac20-cleaning-kit-front.webp',
    weight: 340,
    variants: [{ color: 'Default Title', sku: 'CR-CLEAN-KIT', price: 19.95, inventory: 25 }],
  },
];

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowFor(product, variant, index) {
  const first = index === 0;
  const defaultVariant = variant.color === 'Default Title';
  return {
    Title: first ? product.title : '',
    'URL handle': product.handle,
    Description: first ? product.description : '',
    Vendor: first ? 'Crosley' : '',
    Type: first ? product.type : '',
    Tags: first ? product.tags.join(', ') : '',
    'Published on online store': first ? 'TRUE' : '',
    Status: first ? 'Active' : '',
    SKU: variant.sku,
    'Option1 name': first ? (defaultVariant ? 'Title' : 'Color') : '',
    'Option1 value': variant.color,
    Price: variant.price.toFixed(2),
    'Compare-at price': variant.compareAt?.toFixed(2) ?? '',
    'Cost per item': (variant.price * 0.55).toFixed(2),
    'Charge tax': 'TRUE',
    'Inventory tracker': 'shopify',
    'Inventory quantity': variant.inventory,
    'Continue selling when out of stock': 'DENY',
    'Weight value (grams)': product.weight,
    'Weight unit for display': 'g',
    'Requires shipping': 'TRUE',
    'Fulfillment service': 'manual',
    'Gift card': 'FALSE',
    'SEO title': first ? product.title : '',
    'SEO description': first ? product.description : '',
    'Color (product.metafields.shopify.color-pattern)': defaultVariant ? '' : variant.color.toLowerCase(),
    'Google Shopping / Condition': 'New',
    'Google Shopping / Custom product': 'FALSE',
  };
}

const rows = products.flatMap((product) =>
  product.variants.map((variant, index) => rowFor(product, variant, index)),
);

const csv = [
  headers.join(','),
  ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
].join('\n');

const mediaManifest = products.map((product) => ({
  handle: product.handle,
  title: product.title,
  imagePath: resolve(sourceAssetRoot, product.image),
  alt: `${product.title} product image`,
}));

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${csv}\n`, 'utf8');
await writeFile(mediaManifestPath, `${JSON.stringify(mediaManifest, null, 2)}\n`, 'utf8');

console.log(`Created ${outputPath}`);
console.log(`Created ${mediaManifestPath}`);
console.log(`${products.length} products, ${rows.length} variants`);
