# app.py
from flask import Flask, send_from_directory, jsonify, session, request
from flask_cors import CORS
from models import db, User, Recipe
from auth_routes import auth_bp
from werkzeug.utils import secure_filename
import os

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def create_app():

    # Initialize Flask with the correct static folder path
    app = Flask(__name__, static_folder='../frontend/static')

    CORS(app, supports_credentials=True)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recipe_app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'your_super_secret_key')

    UPLOAD_FOLDER = os.path.join(app.root_path, 'uploads')
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
    app.config['ALLOWED_EXTENSIONS'] = ALLOWED_EXTENSIONS

    db.init_app(app)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    with app.app_context():
        db.create_all()

    # --- Recipe API Routes ---
    @app.route('/api/recipes', methods=['GET'])
    def get_all_recipes():
        recipes = Recipe.query.all()
        return jsonify([recipe.to_dict() for recipe in recipes])

    @app.route('/api/recipes', methods=['POST'])
    def add_recipe():
        try:
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'message': 'Unauthorized'}), 401

            if 'image' not in request.files or request.files['image'].filename == '':
                return jsonify({'message': 'No image file uploaded'}), 400

            image_file = request.files['image']
            if image_file and allowed_file(image_file.filename):
                filename = secure_filename(image_file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                image_file.save(filepath)
            else:
                return jsonify({'message': 'Invalid file type'}), 400

            data = request.form

            # Defensive check for required fields in form data
            required_fields = ['title', 'description', 'ingredients', 'instructions']
            for field in required_fields:
                if field not in data or not data.get(field).strip():
                    return jsonify({'message': f'Missing required field: {field}'}), 400

            new_recipe = Recipe(
                title=data['title'],
                description=data['description'],
                ingredients=data['ingredients'],
                instructions=data['instructions'],
                creator_id=user_id,
                image_filename=filename
            )
            db.session.add(new_recipe)
            db.session.commit()
            return jsonify({'message': 'Recipe added successfully!'}), 201

        except Exception as e:
            # Log the full traceback for debugging
            import traceback
            print("Exception in add_recipe:", e)
            traceback.print_exc()
            return jsonify({'message': 'Internal server error'}), 500


    @app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
    def get_recipe(recipe_id):
        recipe = Recipe.query.get_or_404(recipe_id)
        return jsonify(recipe.to_dict())

    @app.route('/api/recipes/<int:recipe_id>', methods=['PUT'])
    def update_recipe(recipe_id):
        user_id = session.get('user_id')
        recipe = Recipe.query.get_or_404(recipe_id)

        if not user_id or recipe.creator_id != user_id:
            return jsonify({'message': 'Unauthorized to edit this recipe'}), 403

        data = request.form

        if 'image' in request.files and request.files['image'].filename != '':
            image_file = request.files['image']
            if image_file and allowed_file(image_file.filename):
                if recipe.image_filename:
                    old_filepath = os.path.join(app.config['UPLOAD_FOLDER'], recipe.image_filename)
                    if os.path.exists(old_filepath):
                        os.remove(old_filepath)
                filename = secure_filename(image_file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                image_file.save(filepath)
                recipe.image_filename = filename
            else:
                return jsonify({'message': 'Invalid file type for image update'}), 400

        recipe.title = data.get('title', recipe.title)
        recipe.description = data.get('description', recipe.description)
        recipe.ingredients = data.get('ingredients', recipe.ingredients)
        recipe.instructions = data.get('instructions', recipe.instructions)

        db.session.commit()
        return jsonify({'message': 'Recipe updated successfully!'}), 200

    @app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
    def delete_recipe(recipe_id):
        user_id = session.get('user_id')
        recipe = Recipe.query.get_or_404(recipe_id)

        if not user_id or recipe.creator_id != user_id:
            return jsonify({'message': 'Unauthorized to delete this recipe'}), 403

        if recipe.image_filename:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], recipe.image_filename)
            if os.path.exists(filepath):
                os.remove(filepath)

        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Recipe deleted successfully!'}), 200

    @app.route('/api/recipes/<int:recipe_id>/save', methods=['POST'])
    def toggle_save_recipe(recipe_id):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'message': 'Unauthorized'}), 401

        user = User.query.get_or_404(user_id)
        recipe = Recipe.query.get_or_404(recipe_id)

        if recipe in user.saved_recipes:
            user.saved_recipes.remove(recipe)
            db.session.commit()
            return jsonify({'message': 'Recipe unsaved.', 'saved': False}), 200
        else:
            user.saved_recipes.append(recipe)
            db.session.commit()
            return jsonify({'message': 'Recipe saved!', 'saved': True}), 200

    @app.route('/api/recipes/<int:recipe_id>/like', methods=['POST'])
    def toggle_like_recipe(recipe_id):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'message': 'Unauthorized'}), 401

        user = User.query.get_or_404(user_id)
        recipe = Recipe.query.get_or_404(recipe_id)

        if recipe in user.liked_recipes:
            user.liked_recipes.remove(recipe)
            recipe.likes = max(0, recipe.likes - 1)
            db.session.commit()
            return jsonify({'message': 'Recipe unliked.', 'liked': False, 'likes': recipe.likes}), 200
        else:
            user.liked_recipes.append(recipe)
            recipe.likes += 1
            db.session.commit()
            return jsonify({'message': 'Recipe liked!', 'liked': True, 'likes': recipe.likes}), 200

    @app.route('/api/my-saved-recipes', methods=['GET'])
    def get_my_saved_recipes():
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'message': 'Unauthorized'}), 401

        user = User.query.get_or_404(user_id)
        saved_recipes = user.saved_recipes.all()
        return jsonify([recipe.to_dict() for recipe in saved_recipes])

    @app.route('/api/my-saved-recipes-status', methods=['GET'])
    def get_my_saved_recipes_status():
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'savedRecipeIds': []}), 200

        user = User.query.get_or_404(user_id)
        saved_ids = [recipe.id for recipe in user.saved_recipes]
        return jsonify({'savedRecipeIds': saved_ids}), 200

    @app.route('/api/my-liked-recipes-status', methods=['GET'])
    def get_my_liked_recipes_status():
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'likedRecipeIds': []}), 200

        user = User.query.get_or_404(user_id)
        liked_ids = [recipe.id for recipe in user.liked_recipes]
        return jsonify({'likedRecipeIds': liked_ids}), 200

    @app.route('/api/hello')
    def hello():
        return jsonify(message="Hello from Flask API!")

    @app.route('/uploads/<path:filename>')
    def serve_uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        

    # Route to serve the main index.html file for all non-API paths
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.root_path, '../frontend', path)):
            return send_from_directory(os.path.join(app.root_path, '../frontend'), path)
        else:
            return send_from_directory(os.path.join(app.root_path, '../frontend'), 'index.html')


    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
