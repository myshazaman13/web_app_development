from flask import Blueprint, request, jsonify, session
from models import db, User
from functools import wraps

auth_bp = Blueprint('auth', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify(message="Unauthorized: Please log in."), 401
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify(message="Email and password are required."), 400

    if User.query.filter_by(email=email).first():
        return jsonify(message="User with that email already exists."), 409

    new_user = User(email=email)
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    session['user_id'] = new_user.id
    session['user_email'] = new_user.email
    return jsonify(message="User registered and logged in successfully!", userId=new_user.id, userEmail=new_user.email), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        session['user_id'] = user.id
        session['user_email'] = user.email
        return jsonify(message="Logged in successfully!", userId=user.id, userEmail=user.email), 200
    else:
        return jsonify(message="Invalid email or password."), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    session.pop('user_id', None)
    session.pop('user_email', None)
    return jsonify(message="Logged out successfully!"), 200

@auth_bp.route('/status', methods=['GET'])
def auth_status():

    if 'user_id' in session:
        return jsonify(loggedIn=True, userId=session['user_id'], userEmail=session['user_email']), 200
    return jsonify(loggedIn=False), 200
