from flask import Flask, request, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_cors import CORS
import sqlite3
import hashlib

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Replace with a real secret key!
CORS(app, supports_credentials=True)

login_manager = LoginManager()
login_manager.init_app(app)

# Setup SQLite
def init_db():
    with sqlite3.connect('database.db') as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                article_title TEXT
            )
        ''')

init_db()

class User(UserMixin):
    def __init__(self, id, email):
        self.id = id
        self.email = email

@login_manager.user_loader
def load_user(user_id):
    with sqlite3.connect('database.db') as conn:
        user = conn.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
        if user:
            return User(user[0], user[1])
    return None

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    email = data['email']
    password = hashlib.sha256(data['password'].encode()).hexdigest()

    with sqlite3.connect('database.db') as conn:
        try:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', (email, password))
            user_id = cursor.lastrowid
            conn.commit()
            user = User(user_id, email)
            login_user(user)
            return jsonify({"message": "Signup successful"}), 200
        except sqlite3.IntegrityError:
            return jsonify({"message": "Email already exists"}), 400
        except Exception as e:
            return jsonify({"message": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data['email']
    password = hashlib.sha256(data['password'].encode()).hexdigest()

    with sqlite3.connect('database.db') as conn:
        user = conn.execute('SELECT * FROM users WHERE email=? AND password=?', (email, password)).fetchone()
        if user:
            user_obj = User(user[0], user[1])
            login_user(user_obj)
            return jsonify({"message": "Login successful"}), 200
        else:
            return jsonify({"message": "Invalid credentials"}), 401

@app.route("/like", methods=["POST"])
@login_required
def like_article():
    data = request.json
    title = data['title']
    with sqlite3.connect('database.db') as conn:
        conn.execute('INSERT INTO likes (user_id, article_title) VALUES (?, ?)', (current_user.id, title))
        conn.commit()
    return jsonify({"message": "Article liked"})

@app.route("/likes", methods=["GET"])
@login_required
def get_likes():
    with sqlite3.connect('database.db') as conn:
        rows = conn.execute('SELECT article_title FROM likes WHERE user_id=?', (current_user.id,)).fetchall()
        return jsonify([row[0] for row in rows])

if __name__ == "__main__":
    app.run(debug=True)
