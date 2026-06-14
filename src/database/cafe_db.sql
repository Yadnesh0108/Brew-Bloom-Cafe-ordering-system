-- ============================================================
--  Brew & Bloom Cafe — Database Schema + Sample Data
--  Run in phpMyAdmin or: mysql -u root -p < cafe_db.sql
--  MySQL 5.7+ compatible
-- ============================================================

CREATE DATABASE IF NOT EXISTS cafe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cafe_db;

CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)         NOT NULL,
    email      VARCHAR(150)         NOT NULL UNIQUE,
    password   VARCHAR(255)         NOT NULL,
    role       ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP            DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP            DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT          NOT NULL,
    menu_id    INT          NOT NULL,
    quantity   INT          NOT NULL DEFAULT 1,
    unit_price DECIMAL(8,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)  ON DELETE CASCADE,
    FOREIGN KEY (menu_id)  REFERENCES menu(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── SAMPLE DATA ──────────────────────────────────────────────
-- Passwords: admin@cafe.com=admin123 | john@example.com=demo1234
INSERT INTO users (name, email, password, role) VALUES
('Admin',        'admin@cafe.com',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('John Doe',     'john@example.com',  '$2y$10$TKh8H1.PfQ0A32/erkC.eOC3I5VJhDJLrfJGw8BkMRkxGHRWXmjUu', 'user'),
('Priya Sharma', 'priya@example.com', '$2y$10$TKh8H1.PfQ0A32/erkC.eOC3I5VJhDJLrfJGw8BkMRkxGHRWXmjUu', 'user');

INSERT INTO categories (name, icon) VALUES
('Coffee','☕'),('Tea','🍵'),('Snacks','🥐'),('Shakes','🥤'),('Specials','⭐');

INSERT INTO menu (category_id, name, description, price, image) VALUES
(1,'Espresso','Bold single-shot espresso with rich crema',80.00,'espresso.jpg'),
(1,'Cappuccino','Equal parts espresso, steamed milk, and silky foam',120.00,'cappuccino.jpg'),
(1,'Café Latte','Smooth espresso with generous steamed milk',130.00,'latte.jpg'),
(1,'Cold Brew','12-hour slow-steeped cold brew, served over ice',150.00,'coldbrew.jpg'),
(1,'Caramel Macchiato','Vanilla-infused milk with espresso and caramel drizzle',160.00,'macchiato.jpg'),
(1,'Mocha','Espresso blended with chocolate and steamed milk',145.00,'mocha.jpg'),
(2,'Masala Chai','Spiced Indian tea brewed with milk and aromatic spices',70.00,'chai.jpg'),
(2,'Green Tea','Pure Japanese green tea — light, fresh, and earthy',90.00,'greentea.jpg'),
(2,'Chamomile','Soothing herbal chamomile with hints of honey',95.00,'chamomile.jpg'),
(2,'Iced Lemon Tea','Freshly brewed black tea with lemon and ice',100.00,'icedtea.jpg'),
(3,'Butter Croissant','Flaky, golden French-style croissant with butter',110.00,'croissant.jpg'),
(3,'Banana Bread','Moist homemade banana bread slice',90.00,'bananabread.jpg'),
(3,'Club Sandwich','Triple-decker with chicken, cheese, and fresh veggies',180.00,'sandwich.jpg'),
(3,'Bruschetta','Toasted sourdough with tomato, basil, and olive oil',130.00,'bruschetta.jpg'),
(3,'Chocolate Muffin','Rich double-chocolate muffin baked fresh daily',95.00,'muffin.jpg'),
(4,'Oreo Shake','Creamy vanilla shake blended with Oreo cookies',160.00,'oreoshake.jpg'),
(4,'Mango Shake','Fresh Alphonso mango blended with chilled milk',150.00,'mangoshake.jpg'),
(4,'Strawberry Shake','Farm-fresh strawberries blended smooth',155.00,'strawshake.jpg'),
(5,'Dalgona Coffee','Whipped coffee cream over chilled milk — viral classic',170.00,'dalgona.jpg'),
(5,'Affogato','Vanilla gelato drowned in a hot espresso shot',175.00,'affogato.jpg'),
(5,'Cafe Frappe','Blended iced coffee with whipped cream',165.00,'frappe.jpg');

INSERT INTO orders (user_id, total_price, status, table_no, created_at) VALUES
(2, 370.00, 'Delivered', 'T3', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 250.00, 'Preparing', 'T1', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(3, 430.00, 'Ready',     'T5', DATE_SUB(NOW(), INTERVAL 30 MINUTE));

INSERT INTO order_items (order_id, menu_id, quantity, unit_price) VALUES
(1,3,2,130.00),(1,11,1,110.00),
(2,1,1,80.00),(2,14,1,130.00),(2,8,1,90.00),
(3,5,2,160.00),(3,21,1,170.00);
