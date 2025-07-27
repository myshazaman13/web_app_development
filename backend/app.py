# app.py
from flask import Flask, send_from_directory, jsonify, session
from flask_cors import CORS
from models import db, User, Recipe, UserRecipe, UserLikedRecipe
from auth_routes import auth_bp
from recipe_routes import recipe_bp
import os

def create_app():
    # Initialize Flask app.
    # We remove static_url_path='/' here. Flask will default to '/static' for static files.
    # The 'frontend' directory is where our HTML, CSS, and JS files reside.
    app = Flask(__name__, static_folder='../frontend')
    
    # Configure CORS for frontend communication.
    # In a production environment, you should restrict this to your frontend's domain.
    CORS(app, supports_credentials=True) # Important for session cookies

    # Database configuration
    # For local development, use a local SQLite database.
    # For PythonAnywhere, it will be in your /home/yourusername/ folder.
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recipe_app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'your_super_secret_key') # Use environment variable for production

    # --- New configuration for file uploads ---
    # Define the upload folder relative to the project root
    # This will place uploaded images in 'your-recipe-app/frontend/uploads'
    UPLOAD_FOLDER = os.path.join(app.root_path, '../frontend/uploads')
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER) # Create the directory if it doesn't exist
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # Max upload size: 16MB

    # Allowed extensions for image uploads
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}


    # Initialize SQLAlchemy with the app
    db.init_app(app)

    # Register blueprints for different parts of the API
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(recipe_bp, url_prefix='/api') # Recipes will be under /api/recipes

    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()

    # --- IMPORTANT CHANGE: Handle static files and SPA routing more explicitly ---

    # Route for serving specific static files (CSS, JS, images, etc.)
    # Flask's default static file serving is usually at /static/, so we'll match that.
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        # Ensure the path is correct relative to the app's root
        # This will serve files from your 'frontend' directory when requested via /static/
        return send_from_directory(os.path.join(app.root_path, '../frontend'), filename)

    # Route for serving uploaded images specifically
    @app.route('/uploads/<path:filename>')
    def serve_uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


    # Catch-all route for the single-page application (SPA)
    # This ensures that any route not handled by an API endpoint or /static/
    # will serve the main index.html file, allowing client-side routing.
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        # Always serve index.html for any non-API or non-static path
        return send_from_directory(os.path.join(app.root_path, '../frontend'), 'index.html')


    # Basic route for testing API connectivity (remains the same)
    @app.route('/api/hello')
    def hello():
        return jsonify(message="Hello from Flask API!")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True) # debug=True enables auto-reloading and helpful error messages
