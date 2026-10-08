export const DAIRY_CATEGORIES = [
  { id: 'All', label: 'All Categories', icon: '🥛', description: 'All dairy and allied products' },
  
  // --- Core Fresh Dairy Products ---
  { id: 'milk', label: 'Milk (Packaged & Pouch)', icon: '🥛', description: 'Full cream, toned, double-toned, cow, buffalo, skimmed & A2 milk' },
  { id: 'raw-milk', label: 'Raw Farm Milk', icon: '🪣', description: 'Direct farmer procurement, bulk chilling center & unprocessed raw milk' },
  { id: 'curd', label: 'Curd, Dahi & Yogurt', icon: '🥣', description: 'Plain dahi, probiotic curd, mishti doi, Greek yogurt & flavored yogurt' },
  { id: 'paneer', label: 'Paneer & Cottage Cheese', icon: '🧀', description: 'Fresh malai paneer, low fat paneer, masala paneer, fried paneer cubes' },
  { id: 'ghee', label: 'Desi Ghee & Clarified Butter', icon: '🫙', description: 'Pure cow ghee, buffalo ghee, danedar ghee, bilona A2 ghee, organic ghee' },
  { id: 'butter', label: 'Butter & Makkhan', icon: '🧈', description: 'Table butter, white desi makkhan, unsalted butter, garlic & herb butter' },
  { id: 'cream', label: 'Fresh Cream & Malai', icon: '🍶', description: 'Fresh heavy whipping cream, cooking cream, clotted malai' },
  { id: 'cheese', label: 'Cheese & Mozzarella', icon: '🧀', description: 'Cheese slices, mozzarella block & shreds, cheddar, cheese cubes, cheese spread' },
  { id: 'buttermilk', label: 'Chaas, Lassi & Mattha', icon: '🥤', description: 'Spiced buttermilk, sweet lassi, mango lassi, masala chaas, mattha' },
  
  // --- Dairy Desserts, Sweets & Beverages ---
  { id: 'sweets', label: 'Dairy Sweets & Mithai', icon: '🍬', description: 'Rasgulla, Gulab Jamun, Rasmalai, Peda, Milk Cake, Barfi, Sandesh, Kalakand' },
  { id: 'khoya', label: 'Khoya / Mawa & Solids', icon: '🥟', description: 'Dhab, Batti, Pindi mawa, fresh chenna, evaporated milk solids' },
  { id: 'milkshake', label: 'Milkshakes & Flavored Milk', icon: '🧃', description: 'Badam milk, chocolate shake, mango shake, cold coffee, strawberry shake' },
  { id: 'ice-cream', label: 'Ice Cream & Kulfi', icon: '🍦', description: 'Matka kulfi, ice cream tubs, chocobars, cassata, sundaes, stick kulfi' },
  { id: 'desserts', label: 'Dairy Desserts & Puddings', icon: '🍮', description: 'Shrikhand, Amrakhand, Kheer, Rabri, Payasam, Custard, Fruit Cream, Basundi' },
  
  // --- Processed, Powders & Fitness Dairy ---
  { id: 'dairy-powder', label: 'Milk Powder & Condensed Milk', icon: '📦', description: 'Skimmed milk powder (SMP), whole milk powder, dairy whitener, condensed milk' },
  { id: 'whey-protein', label: 'Whey & Protein Fitness Dairy', icon: '💪', description: 'Liquid whey, whey protein isolate, high protein curd, colostrum / khees' },
  { id: 'spreads', label: 'Dairy Spreads & Dips', icon: '🍞', description: 'Garlic butter spread, creamy cheese spreads, yogurt dips, sandwich spreads' },
  { id: 'probiotics', label: 'Probiotic & Fermented Dairy', icon: '🧪', description: 'Kefir, cultured buttermilk, acidophilus milk, probiotic health shots' },
  { id: 'organic-dairy', label: 'Organic & A2 Farm Dairy', icon: '🌿', description: 'Certified organic milk, A2 Gir cow milk, farm-fresh artisanal dairy' },
  
  // --- Dairy Booth Allied & Retail Snacks ---
  { id: 'namkeen', label: 'Namkeen & Savory Snacks', icon: '🥨', description: 'Aloo bhujia, sev, mixture, mathri, dalmoth, roasted chana, salted peanuts' },
  { id: 'chips', label: 'Chips, Crisps & Wafers', icon: '🥔', description: 'Potato chips, banana wafers, nachos, corn puffs, crispy snacks' },
  { id: 'chocolate', label: 'Chocolates & Confectionery', icon: '🍫', description: 'Milk chocolates, dark chocolate bars, dairy fudge, candies, toffees' },
  { id: 'biscuit', label: 'Biscuits, Cookies & Rusks', icon: '🍪', description: 'Milk biscuits, butter cookies, cream biscuits, khari, bakery rusks & toast' },
  { id: 'bakery', label: 'Dairy Bakery & Breads', icon: '🍞', description: 'Fresh milk bread, pav, burger buns, butter cake, cream rolls' },
  { id: 'beverages', label: 'Beverages & Juices', icon: '🧃', description: 'Fruit juices, packaged drinking water, energy drinks, soda & cold drinks' },
  { id: 'dry-fruits', label: 'Dry Fruits & Booth Retail', icon: '🥜', description: 'Almonds, cashews, raisins, walnuts, pistachios, foxnuts (makhana)' },
  
  // --- Farm & Booth Supplies ---
  { id: 'cattle-feed', label: 'Cattle Feed & Farm Supplies', icon: '🌾', description: 'Mustard khal, churi, cattle feed pellets, mineral mixtures, dairy supplements' },
  { id: 'packaging', label: 'Dairy Packaging & Utensils', icon: '🍶', description: 'Milk pouches, containers, glass bottles, milk cans, crates, foil lids' },
  { id: 'other', label: 'Other Allied Products', icon: '🏷️', description: 'Miscellaneous dairy allied items, grocery & retail essentials' }
];

export const CATEGORY_IDS = DAIRY_CATEGORIES.map((c) => c.id);
export const PRODUCT_CATEGORIES = DAIRY_CATEGORIES.filter((c) => c.id !== 'All');

export const MEASUREMENT_UNITS = [
  { id: 'litre', label: 'Litre (L)' },
  { id: 'ml', label: 'Millilitre (ml)' },
  { id: 'kg', label: 'Kilogram (kg)' },
  { id: 'gm', label: 'Gram (g)' },
  { id: 'packet', label: 'Packet / Pouch' },
  { id: 'can', label: 'Milk Can' },
  { id: 'box', label: 'Box / Carton' },
  { id: 'piece', label: 'Piece / Unit' },
  { id: 'bottle', label: 'Bottle' },
  { id: 'jar', label: 'Jar' },
  { id: 'tin', label: 'Tin' },
  { id: 'cup', label: 'Cup / Tub' },
  { id: 'pouch', label: 'Pouch' },
  { id: 'bag', label: 'Bag / Sack' },
  { id: 'slice', label: 'Slice / Pack' }
];

export const getCategoryMeta = (categoryId) => {
  return DAIRY_CATEGORIES.find((c) => c.id === categoryId) || {
    id: categoryId,
    label: categoryId ? categoryId.charAt(0).toUpperCase() + categoryId.slice(1) : 'Dairy Item',
    icon: '🥛',
    description: ''
  };
};
