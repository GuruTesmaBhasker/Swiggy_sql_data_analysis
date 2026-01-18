from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_db_connection
from datetime import datetime
import random

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
def home():
    return {"status": "Swiggy DA backend running"}, 200


@app.route("/restaurants", methods=["GET"])
def get_restaurants():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT restaurant_id, name, cuisine FROM restaurants")
        restaurants = cursor.fetchall()
        return jsonify(restaurants), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/menu/<int:restaurant_id>", methods=["GET"])
def get_menu(restaurant_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT item_id, restaurant_id, item_name, price, category, is_veg
            FROM menu_items
            WHERE restaurant_id = %s
        """, (restaurant_id,))
        menu_items = cursor.fetchall()
        return jsonify(menu_items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/debug/menu-items", methods=["GET"])
def debug_menu_items():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT m.item_id, m.item_name, m.price, m.restaurant_id, r.name as restaurant_name, r.cuisine
            FROM menu_items m
            JOIN restaurants r ON m.restaurant_id = r.restaurant_id
            ORDER BY m.restaurant_id, m.item_id
        """)
        items = cursor.fetchall()
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/order", methods=["POST"])
def create_order():
    conn = None
    cursor = None
    try:
        data = request.json

        user_id = data["user_id"]
        restaurant_id = data["restaurant_id"]  # Now receiving proper integer
        items = data["items"]
        # total_amount will be calculated from DB prices

        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert order (without total_amount initially)
        cursor.execute("""
            INSERT INTO orders (user_id, restaurant_id, order_time, total_amount, order_status)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id,
            restaurant_id,
            datetime.now(),
            0,  # Placeholder, will update after calculating
            "CONFIRMED"
        ))

        order_id = cursor.lastrowid

        # Insert order items and calculate total
        total_amount = 0
        for item in items:
            item_id = item["item_id"]  # Now receiving proper integer
            quantity = item["quantity"]
            
            # Fetch price from database
            cursor.execute("SELECT price FROM menu_items WHERE item_id = %s", (item_id,))
            price_result = cursor.fetchone()
            if not price_result:
                raise Exception(f"Item {item_id} not found in menu")
            
            item_price = price_result[0]
            total_amount += item_price * quantity
            
            cursor.execute("""
                INSERT INTO order_items (order_id, item_id, quantity, item_price)
                VALUES (%s, %s, %s, %s)
            """, (
                order_id,
                item_id,
                quantity,
                item_price
            ))

        # Update order with calculated total amount
        cursor.execute("""
            UPDATE orders SET total_amount = %s WHERE order_id = %s
        """, (total_amount, order_id))

        # Delivery simulation
        expected = random.randint(20, 35)
        actual = expected + random.choice([-5, 0, 10])

        cursor.execute("""
            INSERT INTO deliveries (order_id, expected_minutes, actual_minutes, delivery_status)
            VALUES (%s, %s, %s, %s)
        """, (
            order_id,
            expected,
            actual,
            "DELIVERED"
        ))

        conn.commit()

        return jsonify({
            "message": "Order stored successfully",
            "order_id": order_id
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/rating", methods=["POST"])
def submit_rating():
    conn = None
    cursor = None
    try:
        data = request.json
        order_id = data["order_id"]
        rating = data["rating"]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert or update rating in reviews table
        cursor.execute("""
            INSERT INTO reviews (order_id, rating)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE rating = %s
        """, (order_id, rating, rating))
        
        conn.commit()
        
        return jsonify({
            "message": "Rating submitted successfully",
            "order_id": order_id,
            "rating": rating
        }), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(debug=True)
