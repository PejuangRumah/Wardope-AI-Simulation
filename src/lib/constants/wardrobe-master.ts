// Wardrobe Master Data - Categories, Colors, Occasions, Fits

export const CATEGORIES = {
  FULL_BODY: {
    name: 'Full Body',
    subcategories: ['Dress', 'Jumpsuit']
  },
  TOP: {
    name: 'Top',
    subcategories: ['Shirt', 'T-Shirt', 'Jersey', 'Blouse', 'Tanktop', 'Polo']
  },
  OUTERWEAR: {
    name: 'Outerwear',
    subcategories: ['Cardigan', 'Hoodie', 'Coat', 'Jacket', 'Sweater', 'Vest']
  },
  BOTTOM: {
    name: 'Bottom',
    subcategories: [
      'Jeans',
      'Chinos',
      'Shorts',
      'Trousers',
      'Skirt',
      'Skort',
      'Leggings',
      'Sweatpants',
      'Culottes'
    ]
  },
  ACCESSORY: {
    name: 'Accessory',
    subcategories: [
      'Hat',
      'Belt',
      'Tie',
      'Scarf',
      'Watch',
      'Jewelry',
      'Glasses',
      'Sock',
      'Glove',
      'Bag',
      'Wallet',
      'Miscellaneous'
    ]
  },
  FOOTWEAR: {
    name: 'Footwear',
    subcategories: ['Sneaker', 'Boot', 'Sandal', 'Loafer', 'Lace-up Shoe', 'Flat Shoe', 'Heels']
  }
} as const;

export const COLORS = [
  'red',
  'dark red',
  'maroon',
  'crimson',
  'coral',
  'orange',
  'gold',
  'yellow',
  'green',
  'forest green',
  'olive',
  'army',
  'charcoal',
  'sage',
  'sand',
  'khaki',
  'teal',
  'blue',
  'navy',
  'royal blue',
  'sky blue',
  'indigo',
  'purple',
  'plum',
  'lavender',
  'pink',
  'hot pink',
  'brown',
  'tan',
  'beige',
  'gray',
  'silver',
  'black',
  'white'
] as const;

export const OCCASIONS = [
  'casual',
  'semi-formal',
  'formal',
  'sportswear',
  'party/events',
  'work/office',
  'vacation/travel',
  'lounge/relax'
] as const;

export const FITS = {
  DEFAULT: ['oversized', 'regular', 'relaxed', 'slim'],
  BOTTOMS: ['oversized', 'regular', 'relaxed', 'skinny', 'slim', 'straight', 'tapered', 'wide'],
  TOPS: ['boxy', 'loose', 'oversized', 'regular', 'relaxed', 'slim']
} as const;

export const GENDERS = ['men', 'women'] as const;
