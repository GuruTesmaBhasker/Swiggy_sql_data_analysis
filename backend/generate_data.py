import random
import mysql.connector
from datetime import datetime, timedelta

# ---------- DB CONFIG ----------
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="root",
    database="swiggy_da"
)
cursor = conn.cursor(dictionary=True)

# ---------- SETTINGS ----------
TOTAL_ORDERS = 5000
START_DATE = datetime.now() - timedelta(days=180)
END_DATE = datetime.now()

# ---------- HELPERS ----------
def random_date():
    return START_DATE + (END_DATE - START_DATE) * random.random()

# ---------- FETCH DATA ----------
cursor.execute("SELECT restaurant_id FROM restaurants")
restaurants = cursor.fetchall()

menu_by_restaurant = {}
for r in restaurants:
    cursor.execute(
        "SELECT item_id, price FROM menu_items WHERE restaurant_id = %s",
        (r["restaurant_id"],)
    )
    menu_by_restaurant[r["restaurant_id"]] = cursor.fetchall()

# ---------- GENERATE ORDERS ----------
for _ in range(TOTAL_ORDERS):
    user_id = random.randint(1, 500)
    restaurant_id = random.choice(restaurants)["restaurant_id"]
    menu = menu_by_restaurant[restaurant_id]

    if not menu:
        continue

    order_time = random_date()
    status = random.choices(
        ["DELIVERED", "CANCELLED"], weights=[80, 20]
    )[0]

    item_count = random.randint(1, min(5, len(menu)))
    selected_items = random.sample(menu, item_count)

    total_amount = 0
    order_items = []

    for item in selected_items:
        qty = random.randint(1, 3)
        price = item["price"]
        total_amount += qty * price
        order_items.append((item["item_id"], qty, price))

    # Auto-create user
    cursor.execute(
        "INSERT IGNORE INTO users (user_id) VALUES (%s)",
        (user_id,)
    )

    # Insert order
    cursor.execute("""
        INSERT INTO orders (user_id, restaurant_id, order_time, total_amount, order_status)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, restaurant_id, order_time, total_amount, status))

    order_id = cursor.lastrowid

    # Insert order items
    for item_id, qty, price in order_items:
        cursor.execute("""
            INSERT INTO order_items (order_id, item_id, quantity, item_price)
            VALUES (%s, %s, %s, %s)
        """, (order_id, item_id, qty, price))

    # Delivery + review only if delivered
    if status == "DELIVERED":
        delivery_time = random.randint(20, 60)
        cursor.execute("""
            INSERT INTO deliveries (order_id, expected_minutes, actual_minutes, delivery_status)
            VALUES (%s, %s, %s, 'DELIVERED')
        """, (order_id, 40, delivery_time))

        rating = random.randint(3, 5)
        cursor.execute("""
            INSERT INTO reviews (order_id, rating)
            VALUES (%s, %s)
        """, (order_id, rating))

conn.commit()
cursor.close()
conn.close()

print("✅ Data generation completed")
