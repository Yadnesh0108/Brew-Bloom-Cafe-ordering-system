const mysql = require("mysql2");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const DB_NAME = process.env.DB_NAME || "cafe_db";

// Connect WITHOUT specifying a database so we can CREATE it if needed
const tempConn = mysql.createConnection({
    host:     process.env.DB_HOST || "localhost",
    user:     process.env.DB_USER || "root",
    password: process.env.DB_PASS || ""
});

const tablesSql = `
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255),
    google_id  VARCHAR(100),
    role       ENUM('user','admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(10) DEFAULT '☕'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT           NOT NULL,
    name        VARCHAR(150)  NOT NULL,
    description TEXT,
    price       DECIMAL(8,2)  NOT NULL,
    image       VARCHAR(255)  DEFAULT 'default.jpg',
    available   TINYINT(1)    DEFAULT 1,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    user_id            INT           NOT NULL,
    total_price        DECIMAL(10,2) NOT NULL,
    status             ENUM('Pending','Preparing','Ready','Delivered','Cancelled','Paid') DEFAULT 'Pending',
    table_no           VARCHAR(10)   DEFAULT NULL,
    notes              TEXT          DEFAULT NULL,
    payment_method     ENUM('cash','stripe','razorpay') DEFAULT 'cash',
    payment_reference  VARCHAR(255)  DEFAULT NULL,
    created_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT           DEFAULT NULL,
    name        VARCHAR(100)  NOT NULL,
    rating      TINYINT       NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT          NOT NULL,
    approved    TINYINT(1)    DEFAULT 0,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT          NOT NULL,
    menu_id    INT          NOT NULL,
    quantity   INT          NOT NULL DEFAULT 1,
    unit_price DECIMAL(8,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)  ON DELETE CASCADE,
    FOREIGN KEY (menu_id)  REFERENCES menu(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO categories (id, name, icon) VALUES
(1,'Coffee','☕'),(2,'Tea','🍵'),(3,'Snacks','🥐'),(4,'Shakes','🥤'),(5,'Specials','⭐'),
(6,'Biryani','🍛'),(7,'Burger','🍔'),(8,'Dessert','🍰'),
(9,'Pasta','🍝'),(10,'Pizza','🍕'),(11,'Samosa','🥟');

INSERT IGNORE INTO menu (category_id, name, description, price, image) VALUES
-- Coffee (1)
(1,'Espresso','Bold single-shot espresso with rich crema',80,'https://coffee.alexflipnote.dev/random'),
(1,'Cappuccino','Equal parts espresso, steamed milk, and silky foam',120,'https://coffee.alexflipnote.dev/random'),
(1,'Cafe Latte','Smooth espresso with generous steamed milk',130,'https://coffee.alexflipnote.dev/random'),
(1,'Cold Brew','12-hour slow-steeped cold brew, served over ice',150,'https://coffee.alexflipnote.dev/random'),
(1,'Caramel Macchiato','Vanilla-infused milk with espresso and caramel drizzle',160,'https://coffee.alexflipnote.dev/random'),
(1,'Mocha','Espresso blended with chocolate and steamed milk',145,'https://coffee.alexflipnote.dev/random'),
(1,'Americano','Espresso shots topped with hot water',100,'https://coffee.alexflipnote.dev/random'),
(1,'Flat White','Velvety microfoam over a double espresso',140,'https://coffee.alexflipnote.dev/random'),
(1,'Irish Coffee','Irish whiskey spiked coffee with cream',180,'https://coffee.alexflipnote.dev/random'),
(1,'Affogato','Vanilla gelato drowned in hot espresso',175,'https://coffee.alexflipnote.dev/random'),
-- Tea (2)
(2,'Assam Tea','Malty breakfast tea from Assam, India',80,'https://upload.wikimedia.org/wikipedia/commons/3/3b/Assam-Tee_SFTGFOP1.jpg'),
(2,'Darjeeling Tea','Musky-sweet black tea from the Himalayas',100,'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Darjeeling%2C_India%2C_Darjeeling_tea_in_variety%2C_Black_tea.jpg/640px-Darjeeling%2C_India%2C_Darjeeling_tea_in_variety%2C_Black_tea.jpg'),
(2,'Earl Grey','Black tea flavoured with oil of bergamot',90,'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Earl_Grey_Tea.jpg/640px-Earl_Grey_Tea.jpg'),
(2,'Matcha','Finely ground powdered green tea',150,'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Matcha_Scoop.jpg/640px-Matcha_Scoop.jpg'),
(2,'Sencha','Japanese steamed green tea',110,'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/2017_Kagoshima_sencha.jpg/640px-2017_Kagoshima_sencha.jpg'),
(2,'Genmaicha','Green tea with roasted brown rice',95,'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Genmaicha.JPG/640px-Genmaicha.JPG'),
(2,'Masala Chai','Spiced Indian tea with cardamom and ginger',70,'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Contents_of_a_bag_of_chai_tea.jpg/640px-Contents_of_a_bag_of_chai_tea.jpg'),
(2,'Lapsang Souchong','Pine-smoked black tea from China',120,'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Lapsang_Souchong.jpg/640px-Lapsang_Souchong.jpg'),
(2,'Tieguanyin','Iron Goddess oolong — floral and nutty',140,'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Tieguanyin2.jpg/640px-Tieguanyin2.jpg'),
(2,'Baihao Yinzhen','Premium silver needle white tea',160,'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2010_FirstFlush_Yunnan_Baihao_Yinzhen.jpg/640px-2010_FirstFlush_Yunnan_Baihao_Yinzhen.jpg'),
-- Biryani (6)
(6,'Chicken Biryani','Fragrant basmati layered with spiced chicken',220,'https://foodish-api.com/images/biryani/biryani1.jpg'),
(6,'Veg Biryani','Garden vegetables slow-cooked with aromatic rice',180,'https://foodish-api.com/images/biryani/biryani2.jpg'),
(6,'Egg Biryani','Rich biryani with spiced boiled eggs',190,'https://foodish-api.com/images/biryani/biryani3.jpg'),
(6,'Mutton Biryani','Tender mutton cooked in traditional dum style',280,'https://foodish-api.com/images/biryani/biryani4.jpg'),
(6,'Hyderabadi Biryani','Authentic Hyderabadi dum biryani',250,'https://foodish-api.com/images/biryani/biryani5.jpg'),
(6,'Prawn Biryani','Fresh prawns layered with saffron rice',300,'https://foodish-api.com/images/biryani/biryani6.jpg'),
(6,'Mushroom Biryani','Juicy mushrooms in spiced rice',200,'https://foodish-api.com/images/biryani/biryani7.jpg'),
(6,'Keema Biryani','Minced meat simmered with aromatic spices',260,'https://foodish-api.com/images/biryani/biryani8.jpg'),
(6,'Fish Biryani','Catch of the day in coastal-style biryani',290,'https://foodish-api.com/images/biryani/biryani9.jpg'),
(6,'Paneer Biryani','Cottage cheese layered with basmati',210,'https://foodish-api.com/images/biryani/biryani10.jpg'),
-- Burger (7)
(7,'Classic Veg Burger','Crispy veggie patty with fresh lettuce',120,'https://foodish-api.com/images/burger/burger1.jpg'),
(7,'Chicken Burger','Juicy grilled chicken with garlic mayo',150,'https://foodish-api.com/images/burger/burger2.jpg'),
(7,'Cheese Burger','Melted cheddar with caramelized onions',140,'https://foodish-api.com/images/burger/burger3.jpg'),
(7,'Double Decker Burger','Two patties stacked with cheese',200,'https://foodish-api.com/images/burger/burger4.jpg'),
(7,'Paneer Tikka Burger','Spiced paneer with mint chutney',160,'https://foodish-api.com/images/burger/burger5.jpg'),
(7,'Crispy Chicken Burger','Crispy fried chicken with slaw',170,'https://foodish-api.com/images/burger/burger6.jpg'),
(7,'Mushroom Burger','Grilled portobello with truffle oil',130,'https://foodish-api.com/images/burger/burger7.jpg'),
(7,'BBQ Chicken Burger','Smokey BBQ glaze with onion rings',180,'https://foodish-api.com/images/burger/burger8.jpg'),
(7,'Aloo Tikki Burger','Indian-style potato patty burger',110,'https://foodish-api.com/images/burger/burger9.jpg'),
(7,'Spicy Mexican Burger','Jalapenos and chipotle sauce',160,'https://foodish-api.com/images/burger/burger10.jpg'),
-- Dessert (8)
(8,'Gulab Jamun','Soft milk dumplings soaked in rose syrup',80,'https://foodish-api.com/images/dessert/dessert1.jpg'),
(8,'Ice Cream Sundae','Vanilla ice cream with chocolate sauce',150,'https://foodish-api.com/images/dessert/dessert2.jpg'),
(8,'Brownie with Ice Cream','Warm brownie topped with ice cream',180,'https://foodish-api.com/images/dessert/dessert3.jpg'),
(8,'Rasmalai','Soft paneer discs in sweetened milk',120,'https://foodish-api.com/images/dessert/dessert4.jpg'),
(8,'Chocolate Mousse','Silky dark chocolate mousse',160,'https://foodish-api.com/images/dessert/dessert5.jpg'),
(8,'Fruit Trifle','Layered fruit custard dessert',140,'https://foodish-api.com/images/dessert/dessert6.jpg'),
(8,'Kheer','Creamy rice pudding with nuts',100,'https://foodish-api.com/images/dessert/dessert7.jpg'),
(8,'Cheesecake','Baked New York style cheesecake',200,'https://foodish-api.com/images/dessert/dessert8.jpg'),
(8,'Mango Lassi','Chilled yogurt drink with mango',90,'https://foodish-api.com/images/dessert/dessert9.jpg'),
(8,'Jalebi','Crispy spiral sweets in sugar syrup',80,'https://foodish-api.com/images/dessert/dessert10.jpg'),
-- Pasta (9)
(9,'White Sauce Pasta','Creamy Alfredo-style pasta',180,'https://foodish-api.com/images/pasta/pasta1.jpg'),
(9,'Red Sauce Pasta','Tangy tomato basil pasta',170,'https://foodish-api.com/images/pasta/pasta2.jpg'),
(9,'Alfredo Pasta','Rich butter and cream pasta',200,'https://foodish-api.com/images/pasta/pasta3.jpg'),
(9,'Pasta Arrabiata','Spicy garlic tomato pasta',190,'https://foodish-api.com/images/pasta/pasta4.jpg'),
(9,'Pasta Carbonara','Egg and cheese classic pasta',220,'https://foodish-api.com/images/pasta/pasta5.jpg'),
(9,'Pasta Primavera','Seasonal vegetable pasta',180,'https://foodish-api.com/images/pasta/pasta6.jpg'),
(9,'Pesto Pasta','Fresh basil pesto tossed pasta',210,'https://foodish-api.com/images/pasta/pasta7.jpg'),
(9,'Mac and Cheese','Baked macaroni with three cheeses',160,'https://foodish-api.com/images/pasta/pasta8.jpg'),
(9,'Penne Vodka','Penne in creamy tomato vodka sauce',200,'https://foodish-api.com/images/pasta/pasta9.jpg'),
(9,'Baked Pasta','Loaded baked pasta with cheese crust',230,'https://foodish-api.com/images/pasta/pasta10.jpg'),
-- Pizza (10)
(10,'Margherita Pizza','Classic tomato cheese pizza',250,'https://foodish-api.com/images/pizza/pizza1.jpg'),
(10,'Farmhouse Pizza','Loaded garden fresh vegetables',300,'https://foodish-api.com/images/pizza/pizza2.jpg'),
(10,'Pepperoni Pizza','Spicy pepperoni with mozzarella',350,'https://foodish-api.com/images/pizza/pizza3.jpg'),
(10,'Veggie Supreme','Bell peppers onions and olives',280,'https://foodish-api.com/images/pizza/pizza4.jpg'),
(10,'Paneer Tikka Pizza','Spiced paneer with bell peppers',320,'https://foodish-api.com/images/pizza/pizza5.jpg'),
(10,'BBQ Chicken Pizza','Smokey chicken with onions',380,'https://foodish-api.com/images/pizza/pizza6.jpg'),
(10,'Cheese and Corn Pizza','Sweet corn with double cheese',260,'https://foodish-api.com/images/pizza/pizza7.jpg'),
(10,'Mushroom Pizza','Sauteed mushrooms with herbs',270,'https://foodish-api.com/images/pizza/pizza8.jpg'),
(10,'Spicy Mexican Pizza','Jalapenos beans and salsa',310,'https://foodish-api.com/images/pizza/pizza9.jpg'),
(10,'Classic Cheese Pizza','Loaded mozzarella cheese pizza',240,'https://foodish-api.com/images/pizza/pizza10.jpg'),
-- Samosa (11)
(11,'Aloo Samosa','Classic spiced potato samosa',40,'https://foodish-api.com/images/samosa/samosa1.jpg'),
(11,'Onion Samosa','Caramelized onion filled samosa',50,'https://foodish-api.com/images/samosa/samosa2.jpg'),
(11,'Paneer Samosa','Cottage cheese stuffed samosa',60,'https://foodish-api.com/images/samosa/samosa3.jpg'),
(11,'Chicken Samosa','Minced chicken filled samosa',70,'https://foodish-api.com/images/samosa/samosa4.jpg'),
(11,'Keema Samosa','Spiced minced meat samosa',80,'https://foodish-api.com/images/samosa/samosa5.jpg'),
(11,'Chole Samosa','Chickpea stuffed crispy samosa',50,'https://foodish-api.com/images/samosa/samosa6.jpg'),
(11,'Dal Samosa','Lentil filled golden samosa',45,'https://foodish-api.com/images/samosa/samosa7.jpg'),
(11,'Corn Samosa','Creamy corn filled samosa',55,'https://foodish-api.com/images/samosa/samosa8.jpg'),
(11,'Macaroni Samosa','Cheesy macaroni stuffed samosa',60,'https://foodish-api.com/images/samosa/samosa9.jpg'),
(11,'Mixed Veg Samosa','Assorted vegetable samosa',50,'https://foodish-api.com/images/samosa/samosa10.jpg');
`;

tempConn.connect((err) => {
    if (err) {
        console.error("Could not connect to MySQL:", err.message);
        console.error("Make sure MySQL is running and your credentials in .env are correct.");
        process.exit(1);
    }

    console.log("Connected to MySQL");

    // Step 1: Create the database if it doesn't exist
    tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
        if (err) {
            console.error("Failed to create database:", err.message);
            process.exit(1);
        }
        console.log("Database '" + DB_NAME + "' is ready");

        // Step 2: Switch to the database
        tempConn.query("USE `" + DB_NAME + "`", (err) => {
            if (err) {
                console.error("Failed to switch to database:", err.message);
                process.exit(1);
            }

            // Step 3: Run all CREATE TABLE and INSERT queries one by one
            const queries = tablesSql
                .split(";")
                .map(q => q.trim())
                .filter(q => q.length > 0);

            let count = 0;

            function runNext() {
                if (count === queries.length) {
                    console.log("All tables created and seed data inserted.");
                    console.log("Setup complete! Run 'npm start' to launch the server.");
                    tempConn.end();
                    return;
                }
                tempConn.query(queries[count], (err) => {
                    if (err) {
                        console.error("Warning in query #" + (count + 1) + ":", err.message);
                    }
                    count++;
                    runNext();
                });
            }

            runNext();
        });
    });
});
