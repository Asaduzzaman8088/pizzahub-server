import mongoose from "mongoose"
import { connectDB } from "../config/db.js"
import { env } from "../config/env.js"
import { User } from "../models/User.js"
import { MenuItem } from "../models/MenuItem.js"
import { Review } from "../models/Review.js"
import { hashPassword } from "../utils/password.js"
import { recalculateItemRating } from "../utils/ratings.js"

const vendors = [
  { key: "bella", name: "Marco Bellini", email: "vendor@pizzahub.com", businessName: "Bella Napoli Wood Ovens", location: "Little Italy, Manhattan" },
  { key: "brooklyn", name: "Anthony Rivera", email: "vendor2@pizzahub.com", businessName: "Brooklyn Crust & Co.", location: "Williamsburg, Brooklyn" },
  { key: "osteria", name: "Giulia Romano", email: "vendor3@pizzahub.com", businessName: "Osteria Del Forno", location: "SoHo, Manhattan" },
  { key: "square", name: "Darius Cole", email: "vendor4@pizzahub.com", businessName: "Square Pan Artisans", location: "Astoria, Queens" },
  { key: "windy", name: "Sam Kowalski", email: "vendor5@pizzahub.com", businessName: "Windy City Iron Skillet", location: "Midtown, Manhattan" },
  { key: "roma", name: "Elena Russo", email: "vendor6@pizzahub.com", businessName: "Roma Artisan Hearth", location: "Greenwich Village, Manhattan" },
]

const IMG = {
  margherita: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1000&q=80",
  pepperoni: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80",
  truffle: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80",
  detroit: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=1000&q=80",
  deepdish: "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1000&q=80",
  prosciutto: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80",
  vegan: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=1000&q=80",
  cauliflower: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=80",
  formaggi: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=1000&q=80",
  diavola: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=1000&q=80",
}

const items = [
  {
    vendor: "bella",
    itemName: "Margherita Di Bufala D.O.P.",
    category: "classic",
    description:
      "Certified San Marzano tomatoes, imported campana buffalo mozzarella, fresh sweet basil & organic olive oil.",
    longDescription:
      "Our crowning Neapolitan jewel. Hand-stretched using 72-hour cold-fermented double-zero flour, topped with crushed sweet San Marzano plum tomatoes, certified imported Mozzarella di Bufala Campana, and finished with fresh organic basil and cold-pressed extra virgin olive oil. Fired at 900°F for precisely 90 seconds.",
    price: 18.99,
    images: [IMG.margherita, IMG.cauliflower],
    isFeatured: true,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "25-30 min",
    deliveryFee: 0,
    doughFermentation: "72-Hour Cold Fermentation (Caputo 00)",
    ovenTemperature: "900°F (Oak Wood Hearth)",
    ingredients: ["San Marzano D.O.P. Tomatoes", "Bufala Campana Mozzarella", "Fresh Sweet Genovese Basil", "Organic Extra Virgin Olive Oil", "Maldon Sea Salt Flakes"],
    nutritionalInfo: { calories: 840, protein: "38g", carbs: "96g", fat: "32g" },
  },
  {
    vendor: "brooklyn",
    itemName: "Crispy Cup Double Pepperoni",
    category: "meat-lovers",
    description:
      "Charred cupping pepperoni with curled crispy edges, spicy honey drizzle, low moisture whole-milk mozzarella.",
    longDescription:
      "A tribute to the quintessential New York slice. Loaded with naturally smoked artisan pepperoni that chars and curls into crispy, oil-holding cups in the oven, layered over a rich seasoned tomato base and brushed with wildflower habanero hot honey.",
    price: 21.5,
    images: [IMG.pepperoni, IMG.diavola],
    isFeatured: true,
    isVegetarian: false,
    isSpicy: true,
    isGlutenFree: false,
    deliveryTime: "20-25 min",
    deliveryFee: 1.99,
    doughFermentation: "48-Hour Cold Rise",
    ovenTemperature: "650°F (Stone Deck)",
    ingredients: ["Heritage Pork Cupping Pepperoni", "Whole-Milk Low Moisture Mozzarella", "Slow-Simmered Garlic Tomato Sauce", "Wildflower Hot Honey Infusion", "Sicilian Oregano & Pecorino"],
    nutritionalInfo: { calories: 1120, protein: "52g", carbs: "105g", fat: "56g" },
  },
  {
    vendor: "osteria",
    itemName: "Black Truffle & Foraged Mushroom",
    category: "specialty",
    description:
      "Cremini and chanterelle mushrooms, white truffle cream, fontina, whipped ricotta and cracked black pepper.",
    longDescription:
      "An aromatic white-pie masterpiece. Wild chanterelles, shiitakes, and creminis sautéed with garlic butter and fresh thyme, layered over velvety mascarpone and whipped whole-milk ricotta, finished with pure Italian black summer truffle oil.",
    price: 24.99,
    images: [IMG.truffle, IMG.formaggi],
    isFeatured: true,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "30-35 min",
    deliveryFee: 0,
    doughFermentation: "60-Hour Sourdough Poolish",
    ovenTemperature: "800°F (Wood & Gas Hybrid)",
    ingredients: ["Italian Black Summer Truffle Sauce", "Pan-Roasted Wild Mushrooms", "Whipped Bellwether Ricotta", "Alpine Fontina Cheese", "Fresh Thyme & Cracked Black Pepper"],
    nutritionalInfo: { calories: 940, protein: "42g", carbs: "90g", fat: "44g" },
  },
  {
    vendor: "square",
    itemName: "Detroit Motor City Vodka Sausage",
    category: "specialty",
    description:
      "Thick caramelized cheese perimeter, house-made fennel sausage, creamy vodka sauce and crushed oregano.",
    longDescription:
      "Baked in seasoned blue steel automotive pans from Detroit. Double-fermented airy focaccia crumb, Wisconsin brick cheese pushed to the edge to caramelize into a crispy frico crown, topped with fennel pork sausage and vodka cream.",
    price: 22,
    images: [IMG.detroit, IMG.truffle],
    isFeatured: true,
    isVegetarian: false,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "25-30 min",
    deliveryFee: 2.5,
    doughFermentation: "48-Hour High Hydration Focaccia",
    ovenTemperature: "550°F (Cast Steel Pans)",
    ingredients: ["Wisconsin Brick Cheese Frico Crust", "House Ground Fennel Sausage", "Calabrian Tomato Vodka Cream Sauce", "Fresh Whole Milk Mozzarella", "Aged Pecorino Romano"],
    nutritionalInfo: { calories: 1280, protein: "64g", carbs: "118g", fat: "62g" },
  },
  {
    vendor: "windy",
    itemName: "Chicago Deep Dish Supreme",
    category: "meat-lovers",
    description:
      "Two inches of molten mozzarella, layers of seasoned ground chuck, green peppers, mushrooms and chunky plum sauce.",
    longDescription:
      "A heavyweight culinary icon prepared in a deep seasoned cast-iron skillet with a buttery cornmeal-infused crust, packed with premium mozzarella, spiced Italian meatballs, sautéed peppers and onions under chunky tomatoes.",
    price: 26.5,
    images: [IMG.deepdish, IMG.prosciutto],
    isFeatured: true,
    isVegetarian: false,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "35-40 min",
    deliveryFee: 0,
    doughFermentation: "Butter-Laminated Cornmeal Crust",
    ovenTemperature: "475°F (Cast Iron Deep Pan)",
    ingredients: ["Heavy Mozzarella Slices", "Seasoned Italian Pork & Beef Blend", "Sweet Bell Peppers & White Onions", "Chunky Hand-Crushed Plum Tomatoes", "Parmigiano Reggiano Crust Dusting"],
    nutritionalInfo: { calories: 1450, protein: "72g", carbs: "125g", fat: "75g" },
  },
  {
    vendor: "roma",
    itemName: "Sweet Hot Honey & Prosciutto Crudo",
    category: "meat-lovers",
    description:
      "24-month aged Prosciutto di Parma laid over melted stracciatella, fresh baby arugula and habanero honey.",
    longDescription:
      "The ultimate contrast of sweet, salty, spicy, and creamy. A pillowy wood-fired crust with crushed tomato and fior di latte, adorned with razor-thin folds of 24-month Prosciutto di Parma, wild baby arugula, and spicy habanero honey.",
    price: 23.5,
    images: [IMG.prosciutto, IMG.margherita],
    isFeatured: true,
    isVegetarian: false,
    isSpicy: true,
    isGlutenFree: false,
    deliveryTime: "20-25 min",
    deliveryFee: 1.5,
    doughFermentation: "72-Hour Poolish Pre-Ferment",
    ovenTemperature: "900°F (Beehive Brick Oven)",
    ingredients: ["24-Month Prosciutto di Parma D.O.P.", "Creamy Pugliese Stracciatella", "Organic Baby Arugula Leaves", "Artisan Habanero Hot Honey", "Crushed San Marzano Sauce"],
    nutritionalInfo: { calories: 980, protein: "48g", carbs: "94g", fat: "42g" },
  },
  {
    vendor: "brooklyn",
    itemName: "Smoky BBQ Jackfruit & Cashew Mozz",
    category: "vegetarian",
    description:
      "Slow-roasted pulled jackfruit, hickory brown sugar BBQ, house cultured cashew mozzarella and pickled red onions.",
    longDescription:
      "100% plant-based without sacrificing flavor. Young green jackfruit braised with smoked paprika, garlic, and molasses BBQ until fork-tender, melted under cultured cashew mozzarella with charred corn and pickled onions.",
    price: 19.5,
    images: [IMG.vegan, IMG.truffle],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "25-30 min",
    deliveryFee: 1.99,
    doughFermentation: "48-Hour Vegan Certified Dough",
    ovenTemperature: "650°F (Stone Deck)",
    ingredients: ["Hickory Braised Pulled Jackfruit", "Cultured Fermented Cashew Mozzarella", "House Molasses & Apple Cider BBQ", "Pickled Pink Red Onions", "Fresh Cilantro & Charred Corn"],
    nutritionalInfo: { calories: 780, protein: "24g", carbs: "112g", fat: "26g" },
  },
  {
    vendor: "bella",
    itemName: "Cauliflower Crust Garden Primavera",
    category: "vegetarian",
    description:
      "Certified gluten-free roasted cauliflower crust, basil pesto, zucchini blossoms, cherry tomatoes and goat cheese.",
    longDescription:
      "Crispy, nutrient-dense, and entirely grain-free. Pressed with parmesan and organic herbs, baked on a dedicated allergy-safe stone deck, spread with nut-free basil pesto and topped with heirloom tomatoes and chèvre.",
    price: 20.99,
    images: [IMG.cauliflower, IMG.prosciutto],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: true,
    deliveryTime: "25-30 min",
    deliveryFee: 0,
    doughFermentation: "Grain-Free Pressed Cauliflower Base",
    ovenTemperature: "500°F (Allergy-Safe Separate Deck)",
    ingredients: ["Roasted Cauliflower & Egg Crust", "Nut-Free Basil Garlic Pesto", "Sun-Ripened Heirloom Cherry Tomatoes", "Creamy Vermont Chèvre Goat Cheese", "Shaved Baby Zucchini Ribbons"],
    nutritionalInfo: { calories: 620, protein: "32g", carbs: "48g", fat: "34g" },
  },
  {
    vendor: "osteria",
    itemName: "Quattro Formaggi & Caramelized Fig",
    category: "vegetarian",
    description:
      "Gorgonzola dolce, aged provolone, fior di latte, parmigiano, mission fig preserve and toasted walnuts.",
    longDescription:
      "A decadent balance of pungent Italian blue cheese and luscious dark fruit sweetness. Four artisanal cheeses melted over a golden garlic-infused crust, dotted with black Mission fig preserves, walnuts, and watercress.",
    price: 22.5,
    images: [IMG.formaggi, IMG.truffle],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "30-35 min",
    deliveryFee: 0,
    doughFermentation: "60-Hour Sourdough Poolish",
    ovenTemperature: "800°F (Wood & Gas Hybrid)",
    ingredients: ["Gorgonzola Dolce D.O.P.", "Aged Sharp Provolone Piccante", "Fior di Latte Whole Mozzarella", "Mission Black Fig Jam", "Toasted Candied California Walnuts"],
    nutritionalInfo: { calories: 1040, protein: "46g", carbs: "102g", fat: "50g" },
  },
  {
    vendor: "roma",
    itemName: "Spicy Diavola & Calabrian Chili",
    category: "meat-lovers",
    description:
      "Spicy Soppressata salami, crushed Calabrian chili paste, smoked mozzarella and fresh oregano.",
    longDescription:
      "For true heat lovers. Calabrian chili paste infused into the San Marzano tomato base, thick slices of fiery artisan Soppressata, smoked mozzarella to balance the heat, finished with fresh oregano.",
    price: 21,
    images: [IMG.diavola, IMG.pepperoni],
    isFeatured: false,
    isVegetarian: false,
    isSpicy: true,
    isGlutenFree: false,
    deliveryTime: "20-25 min",
    deliveryFee: 1.5,
    doughFermentation: "72-Hour Poolish Pre-Ferment",
    ovenTemperature: "900°F (Beehive Brick Oven)",
    ingredients: ["Spicy Italian Soppressata Salami", "Fermented Calabrian Chili Paste", "Smoked Scamorza Mozzarella", "San Marzano D.O.P. Sauce", "Wild Mountain Dried Oregano"],
    nutritionalInfo: { calories: 1010, protein: "49g", carbs: "92g", fat: "48g" },
  },
  {
    vendor: "windy",
    itemName: "Chicago Carnivore Meat-Lover's Pan",
    category: "meat-lovers",
    description:
      "Pepperoni, Italian fennel sausage, applewood smoked bacon, shaved country ham and three cheeses.",
    longDescription:
      "A hearty meat-forward deep dish. Buttery crust packed with pepperoni, fennel sausage, applewood bacon, and country ham, sealed beneath molten cheese and savory crushed plum tomato sauce.",
    price: 27.99,
    images: [IMG.deepdish, IMG.pepperoni],
    isFeatured: false,
    isVegetarian: false,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "35-40 min",
    deliveryFee: 0,
    doughFermentation: "Butter-Laminated Cornmeal Crust",
    ovenTemperature: "475°F (Cast Iron Deep Pan)",
    ingredients: ["Heritage Pork Cupping Pepperoni", "Ground Italian Fennel Sausage", "Applewood Smoked Bacon Lardons", "Shaved Black Forest Country Ham", "Wisconsin Mozzarella & Provolone"],
    nutritionalInfo: { calories: 1580, protein: "84g", carbs: "128g", fat: "86g" },
  },
  {
    vendor: "square",
    itemName: "Detroit Crispy Corner Pepperoni Classic",
    category: "classic",
    description:
      "Four crispy corners with burnt cheese lace, racing red sauce stripes, and garlic butter brushed crust.",
    longDescription:
      "Every slice boasts caramelized edges. Wisconsin brick cheese crisped against the pan until deep mahogany, topped with natural-casing pepperoni cups and finished with two racing stripes of tangy red sauce.",
    price: 23,
    images: [IMG.detroit, IMG.margherita],
    isFeatured: false,
    isVegetarian: false,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "25-30 min",
    deliveryFee: 2.5,
    doughFermentation: "48-Hour High Hydration Focaccia",
    ovenTemperature: "550°F (Cast Steel Pans)",
    ingredients: ["Wisconsin Brick Cheese", "Natural-Casing Cup Pepperoni", "Simmered Marinara Racing Stripes", "Roasted Garlic Herb Butter Crust", "Flaky Sicilian Sea Salt"],
    nutritionalInfo: { calories: 1220, protein: "58g", carbs: "114g", fat: "58g" },
  },
  {
    vendor: "bella",
    itemName: "Garlic Knots & Marinara Dip",
    category: "sides",
    description:
      "Six pillowy garlic-butter knots dusted with parmesan and served with warm San Marzano marinara.",
    longDescription:
      "Our signature dough tied into soft knots, brushed with roasted garlic herb butter, showered with Parmigiano Reggiano, and served with a warm bowl of San Marzano dipping sauce.",
    price: 7.5,
    images: ["https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=1000&q=80"],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "20-25 min",
    deliveryFee: 0,
    doughFermentation: "48-Hour Cold Rise",
    ovenTemperature: "650°F (Stone Deck)",
    ingredients: ["Slow-Fermented Dough", "Roasted Garlic Herb Butter", "Parmigiano Reggiano", "San Marzano Marinara"],
    nutritionalInfo: { calories: 520, protein: "16g", carbs: "68g", fat: "20g" },
  },
  {
    vendor: "brooklyn",
    itemName: "Buffalo Chicken Wings",
    category: "sides",
    description:
      "Crispy oven-roasted wings tossed in tangy buffalo sauce with blue cheese dip and celery.",
    longDescription:
      "Jumbo chicken wings roasted until shatteringly crisp, coated in a house buffalo sauce with a cooling blue cheese dip and fresh celery sticks.",
    price: 11.99,
    images: ["https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=1000&q=80"],
    isFeatured: false,
    isVegetarian: false,
    isSpicy: true,
    isGlutenFree: true,
    deliveryTime: "20-25 min",
    deliveryFee: 1.99,
    doughFermentation: "",
    ovenTemperature: "500°F (Convection Roast)",
    ingredients: ["Jumbo Chicken Wings", "Buffalo Hot Sauce", "Blue Cheese Dip", "Celery Sticks"],
    nutritionalInfo: { calories: 640, protein: "42g", carbs: "8g", fat: "46g" },
  },
  {
    vendor: "osteria",
    itemName: "Tomato Basil Bruschetta",
    category: "sides",
    description:
      "Toasted sourdough topped with marinated heirloom tomatoes, basil, garlic and balsamic glaze.",
    longDescription:
      "Four slices of grilled sourdough loaded with sweet heirloom tomatoes, torn basil, shaved garlic, extra virgin olive oil, and a drizzle of aged balsamic.",
    price: 8.25,
    images: ["https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=1000&q=80"],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "15-20 min",
    deliveryFee: 0,
    doughFermentation: "",
    ovenTemperature: "450°F (Grill)",
    ingredients: ["Grilled Sourdough", "Heirloom Tomatoes", "Fresh Basil", "Aged Balsamic Glaze"],
    nutritionalInfo: { calories: 380, protein: "12g", carbs: "48g", fat: "16g" },
  },
  {
    vendor: "windy",
    itemName: "Classic Italian Tiramisu",
    category: "beverages",
    description:
      "Espresso-soaked ladyfingers layered with mascarpone cream and dusted cocoa.",
    longDescription:
      "A generous slice of traditional tiramisu made with Italian mascarpone, strong espresso, marsala-soaked ladyfingers, and a snow of dark cocoa.",
    price: 9.5,
    images: ["https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=1000&q=80"],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: false,
    deliveryTime: "15-20 min",
    deliveryFee: 0,
    ingredients: ["Mascarpone Cream", "Espresso-Soaked Ladyfingers", "Marsala", "Dark Cocoa"],
    nutritionalInfo: { calories: 460, protein: "9g", carbs: "44g", fat: "27g" },
  },
  {
    vendor: "roma",
    itemName: "Pistachio Gelato",
    category: "beverages",
    description:
      "Two scoops of silky Italian pistachio gelato made with Bronte pistachios.",
    longDescription:
      "Dense, slow-churned gelato crafted with Bronte pistachio paste and fresh milk for a rich, nutty finish.",
    price: 6.5,
    images: ["https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=1000&q=80"],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: true,
    deliveryTime: "15-20 min",
    deliveryFee: 0,
    ingredients: ["Bronte Pistachio Paste", "Fresh Whole Milk", "Cane Sugar"],
    nutritionalInfo: { calories: 320, protein: "8g", carbs: "34g", fat: "18g" },
  },
  {
    vendor: "square",
    itemName: "Sparkling Blood Orange Soda",
    category: "beverages",
    description:
      "Chilled Italian blood orange soda with real fruit and a bright citrus finish.",
    longDescription:
      "A 330ml bottle of Sicilian blood orange soda, lightly sweetened and served ice cold to balance the richness of a Detroit-style slice.",
    price: 4.25,
    images: ["https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=1000&q=80"],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: true,
    deliveryTime: "15-20 min",
    deliveryFee: 0,
    ingredients: ["Sicilian Blood Orange Juice", "Sparkling Water", "Cane Sugar"],
    nutritionalInfo: { calories: 140, protein: "0g", carbs: "34g", fat: "0g" },
  },
  {
    vendor: "bella",
    itemName: "Fresh Mint Lemonade",
    category: "beverages",
    description:
      "House-pressed lemonade shaken with fresh mint and served over ice.",
    longDescription:
      "A 500ml bottle of house-pressed lemonade infused with garden mint and lightly sweetened — the perfect palate cleanser for a wood-fired Margherita.",
    price: 4.5,
    images: ["https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=1000&q=80"],
    isFeatured: false,
    isVegetarian: true,
    isSpicy: false,
    isGlutenFree: true,
    deliveryTime: "15-20 min",
    deliveryFee: 0,
    ingredients: ["Fresh-Pressed Lemons", "Garden Mint", "Cane Sugar", "Spring Water"],
    nutritionalInfo: { calories: 110, protein: "0g", carbs: "28g", fat: "0g" },
  },
]

async function upsertUser({ name, email, password, role, businessName }) {
  const existing = await User.findOne({ email })
  const updates = {
    name,
    email,
    role,
    businessName: businessName || undefined,
    isBlocked: false,
  }

  // Once an account has migrated to Better Auth, do not recreate a legacy
  // bcrypt password that could resurrect an old credential.
  if (!existing?.authUserId) {
    updates.password = await hashPassword(password)
  }

  return User.findOneAndUpdate(
    { email },
    { $set: updates },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

async function seed() {
  await connectDB()
  if (mongoose.connection.readyState !== 1) {
    console.error("[Seed] Could not connect to MongoDB. Is it running?")
    process.exit(1)
  }

  console.log("[Seed] Seeding demo accounts...")
  const vendorDocs = {}
  for (const vendor of vendors) {
    vendorDocs[vendor.key] = await upsertUser({
      name: vendor.name,
      email: vendor.email,
      password: "Vendor@123",
      role: "vendor",
      businessName: vendor.businessName,
    })
  }

  await upsertUser({
    name: "PizzaHub Admin",
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    role: "admin",
  })
  await upsertUser({
    name: "Pizza Lover",
    email: "customer@pizzahub.com",
    password: "Customer@123",
    role: "customer",
  })
  const customer2 = await upsertUser({
    name: "Sofia Marchetti",
    email: "customer2@pizzahub.com",
    password: "Customer@123",
    role: "customer",
  })

  console.log("[Seed] Seeding menu items...")
  const itemDocs = {}
  for (const entry of items) {
    const vendor = vendors.find((v) => v.key === entry.vendor)
    const vendorDoc = vendorDocs[entry.vendor]
    const doc = await MenuItem.findOneAndUpdate(
      { itemName: entry.itemName },
      {
        $set: {
          vendorId: vendorDoc._id,
          itemName: entry.itemName,
          category: entry.category,
          description: entry.description,
          longDescription: entry.longDescription,
          price: entry.price,
          location: vendor.location,
          images: entry.images,
          status: "approved",
          isFeatured: entry.isFeatured,
          deliveryTime: entry.deliveryTime,
          deliveryFee: entry.deliveryFee,
          isVegetarian: entry.isVegetarian,
          isSpicy: entry.isSpicy,
          isGlutenFree: entry.isGlutenFree,
          doughFermentation: entry.doughFermentation,
          ovenTemperature: entry.ovenTemperature,
          ingredients: entry.ingredients,
          nutritionalInfo: entry.nutritionalInfo,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    itemDocs[entry.itemName] = doc
  }

  console.log("[Seed] Seeding sample reviews...")
  const reviewTargets = [
    { itemName: "Margherita Di Bufala D.O.P.", rating: 5, comment: "The crust is unreal - blistered, chewy and light. Best Margherita outside Naples." },
    { itemName: "Margherita Di Bufala D.O.P.", rating: 4, comment: "Beautiful buffalo mozzarella. Delivery was a touch late but worth the wait." },
    { itemName: "Crispy Cup Double Pepperoni", rating: 5, comment: "Those crispy pepperoni cups are addictive. The hot honey makes it." },
    { itemName: "Black Truffle & Foraged Mushroom", rating: 5, comment: "Earthy, creamy and luxurious. A once-a-month treat I look forward to." },
  ]

  for (const review of reviewTargets) {
    const item = itemDocs[review.itemName]
    const customer = review.rating === 4 ? customer2 : (await User.findOne({ email: "customer@pizzahub.com" }))
    if (!item || !customer) continue
    await Review.findOneAndUpdate(
      { itemId: item._id, customerId: customer._id },
      { $set: { rating: review.rating, comment: review.comment } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  console.log("[Seed] Recalculating item ratings from reviews...")
  for (const item of Object.values(itemDocs)) {
    await recalculateItemRating(item._id)
  }

  const [userCount, itemCount, reviewCount] = await Promise.all([
    User.countDocuments(),
    MenuItem.countDocuments(),
    Review.countDocuments(),
  ])

  console.log("\n[Seed] Done!")
  console.log(`  Users: ${userCount} | Menu items: ${itemCount} | Reviews: ${reviewCount}`)
  console.log("\nDemo credentials:")
  console.log(`  Admin    -> ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`)
  console.log("  Vendor   -> vendor@pizzahub.com / Vendor@123 (Bella Napoli Wood Ovens)")
  console.log("  Customer -> customer@pizzahub.com / Customer@123")

  await mongoose.connection.close()
  process.exit(0)
}

seed().catch(async (err) => {
  console.error("[Seed] Failed:", err)
  await mongoose.connection.close().catch(() => {})
  process.exit(1)
})
