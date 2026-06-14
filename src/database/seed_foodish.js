const mysql = require("mysql2");
const https = require("https");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const DB_NAME = process.env.DB_NAME || "cafe_db";

const conn = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: DB_NAME,
  multipleStatements: true,
});

const CATEGORIES = [
  { id: 6,  name: "Biryani",        icon: "🍛" },
  { id: 7,  name: "Burger",         icon: "🍔" },
  { id: 8,  name: "Dessert",        icon: "🍰" },
  { id: 9,  name: "Pasta",          icon: "🍝" },
  { id: 10, name: "Pizza",          icon: "🍕" },
  { id: 11, name: "Samosa",         icon: "🥟" },
];

const DISHES = {
  "Biryani": [
    ["Chicken Biryani", "Fragrant basmati layered with spiced chicken", 220],
    ["Veg Biryani", "Garden vegetables slow-cooked with aromatic rice", 180],
    ["Egg Biryani", "Rich biryani with spiced boiled eggs", 190],
    ["Mutton Biryani", "Tender mutton cooked in traditional dum style", 280],
    ["Hyderabadi Biryani", "Authentic Hyderabadi dum biryani", 250],
    ["Prawn Biryani", "Fresh prawns layered with saffron rice", 300],
    ["Mushroom Biryani", "Juicy mushrooms in spiced rice", 200],
    ["Keema Biryani", "Minced meat simmered with aromatic spices", 260],
    ["Fish Biryani", "Catch of the day in coastal-style biryani", 290],
    ["Paneer Biryani", "Cottage cheese layered with basmati", 210],
  ],
  "Burger": [
    ["Classic Veg Burger", "Crispy veggie patty with fresh lettuce", 120],
    ["Chicken Burger", "Juicy grilled chicken with garlic mayo", 150],
    ["Cheese Burger", "Melted cheddar with caramelized onions", 140],
    ["Double Decker Burger", "Two patties stacked with cheese", 200],
    ["Paneer Tikka Burger", "Spiced paneer with mint chutney", 160],
    ["Crispy Chicken Burger", "Crispy fried chicken with slaw", 170],
    ["Mushroom Burger", "Grilled portobello with truffle oil", 130],
    ["BBQ Chicken Burger", "Smokey BBQ glaze with onion rings", 180],
    ["Aloo Tikki Burger", "Indian-style potato patty burger", 110],
    ["Spicy Mexican Burger", "Jalapenos and chipotle sauce", 160],
  ],
  "Dessert": [
    ["Gulab Jamun", "Soft milk dumplings soaked in rose syrup", 80],
    ["Ice Cream Sundae", "Vanilla ice cream with chocolate sauce", 150],
    ["Brownie with Ice Cream", "Warm brownie topped with ice cream", 180],
    ["Rasmalai", "Soft paneer discs in sweetened milk", 120],
    ["Chocolate Mousse", "Silky dark chocolate mousse", 160],
    ["Fruit Trifle", "Layered fruit custard dessert", 140],
    ["Kheer", "Creamy rice pudding with nuts", 100],
    ["Cheesecake", "Baked New York style cheesecake", 200],
    ["Mango Lassi", "Chilled yogurt drink with mango", 90],
    ["Jalebi", "Crispy spiral sweets in sugar syrup", 80],
  ],
  "Pasta": [
    ["White Sauce Pasta", "Creamy Alfredo-style pasta", 180],
    ["Red Sauce Pasta", "Tangy tomato basil pasta", 170],
    ["Alfredo Pasta", "Rich butter and cream pasta", 200],
    ["Pasta Arrabiata", "Spicy garlic tomato pasta", 190],
    ["Pasta Carbonara", "Egg and cheese classic pasta", 220],
    ["Pasta Primavera", "Seasonal vegetable pasta", 180],
    ["Pesto Pasta", "Fresh basil pesto tossed pasta", 210],
    ["Mac and Cheese", "Baked macaroni with three cheeses", 160],
    ["Penne Vodka", "Penne in creamy tomato vodka sauce", 200],
    ["Baked Pasta", "Loaded baked pasta with cheese crust", 230],
  ],
  "Pizza": [
    ["Margherita Pizza", "Classic tomato cheese pizza", 250],
    ["Farmhouse Pizza", "Loaded garden fresh vegetables", 300],
    ["Pepperoni Pizza", "Spicy pepperoni with mozzarella", 350],
    ["Veggie Supreme", "Bell peppers onions and olives", 280],
    ["Paneer Tikka Pizza", "Spiced paneer with bell peppers", 320],
    ["BBQ Chicken Pizza", "Smokey chicken with onions", 380],
    ["Cheese and Corn Pizza", "Sweet corn with double cheese", 260],
    ["Mushroom Pizza", "Sauteed mushrooms with herbs", 270],
    ["Spicy Mexican Pizza", "Jalapenos beans and salsa", 310],
    ["Classic Cheese Pizza", "Loaded mozzarella cheese pizza", 240],
  ],
  "Samosa": [
    ["Aloo Samosa", "Classic spiced potato samosa", 40],
    ["Onion Samosa", "Caramelized onion filled samosa", 50],
    ["Paneer Samosa", "Cottage cheese stuffed samosa", 60],
    ["Chicken Samosa", "Minced chicken filled samosa", 70],
    ["Keema Samosa", "Spiced minced meat samosa", 80],
    ["Chole Samosa", "Chickpea stuffed crispy samosa", 50],
    ["Dal Samosa", "Lentil filled golden samosa", 45],
    ["Corn Samosa", "Creamy corn filled samosa", 55],
    ["Macaroni Samosa", "Cheesy macaroni stuffed samosa", 60],
    ["Mixed Veg Samosa", "Assorted vegetable samosa", 50],
  ],
};

function fetchImage(category) {
  return new Promise((resolve, reject) => {
    const url = `https://foodish-api.com/api/images/${category}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.image);
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

async function seed() {
  conn.connect(async (err) => {
    if (err) {
      console.error("DB connection failed:", err.message);
      process.exit(1);
    }
    console.log("Connected to MySQL\n");

    // 1. Clear existing data
    conn.query("DELETE FROM order_items", (e) => {
      if (e) console.error("Warning clearing order_items:", e.message);
    });
    conn.query("DELETE FROM orders", (e) => {
      if (e) console.error("Warning clearing orders:", e.message);
    });
    conn.query("DELETE FROM menu", (e) => {
      if (e) console.error("Warning clearing menu:", e.message);
    });
    conn.query("DELETE FROM categories WHERE id > 5", (e) => {
      if (e) console.error("Warning clearing new categories:", e.message);
    });
    conn.query("ALTER TABLE menu AUTO_INCREMENT = 1", () => {});

    // Small delay for deletes
    await new Promise((r) => setTimeout(r, 500));

    // 2. Insert new categories
    for (const cat of CATEGORIES) {
      conn.query(
        "INSERT IGNORE INTO categories (id, name, icon) VALUES (?, ?, ?)",
        [cat.id, cat.name, cat.icon],
        (e) => {
          if (e) console.error(`Category ${cat.name}:`, e.message);
          else console.log(`  ✓ Category: ${cat.icon} ${cat.name}`);
        }
      );
    }

    await new Promise((r) => setTimeout(r, 500));

    // 3. Insert dishes with Foodish images
    for (const cat of CATEGORIES) {
      const dishes = DISHES[cat.name];
      const catSlug = cat.name.toLowerCase().replace(/\s+/g, "-");

      console.log(`\n  Fetching images for ${cat.name}...`);

      for (let i = 0; i < dishes.length; i++) {
        const [name, desc, price] = dishes[i];
        const imageUrl = await fetchImage(catSlug);

        if (!imageUrl) {
          console.error(`    ✗ ${name} — no image, skipping`);
          continue;
        }

        conn.query(
          "INSERT INTO menu (category_id, name, description, price, image) VALUES (?, ?, ?, ?, ?)",
          [cat.id, name, desc, price, imageUrl],
          (e) => {
            if (e) console.error(`    ✗ ${name}: ${e.message}`);
            else console.log(`    ✓ ${name} — ₹${price}`);
          }
        );

        // Small delay between API calls
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Wait for all inserts
    await new Promise((r) => setTimeout(r, 2000));

    console.log("\n✅ Seed complete! All Foodish dishes added.");
    console.log("Run 'npm start' to launch the server.");

    conn.end();
  });
}

seed();
