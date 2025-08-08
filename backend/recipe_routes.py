# recipe_routes.py
from flask import Blueprint, request, jsonify, session, current_app
# Removed UserRecipe and UserLikedRecipe, as they no longer exist in models.py
from models import db, Recipe, User
from auth_routes import login_required
from werkzeug.utils import secure_filename
import os
import uuid

# Create a blueprint for recipe-related routes
recipe_bp = Blueprint('recipe_bp', __name__)

# Helper function to check for allowed file extensions
def allowed_file(filename):
    """
    Checks if a file's extension is in the allowed list.
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@recipe_bp.route('/recipes', methods=['POST'])
@login_required
def add_recipe():
    """
    Adds a new recipe to the database, including an image upload.
    """
    # Use request.form for text data and request.files for file data
    title = request.form.get('title')
    description = request.form.get('description')
    ingredients = request.form.get('ingredients')
    instructions = request.form.get('instructions')
    creator_id = session.get('user_id')

    if not all([title, description, ingredients, instructions, creator_id]):
        return jsonify(message="Missing required fields."), 400
    
    # Handle image upload
    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        
        # Check if a file was selected and it's allowed
        if file and allowed_file(file.filename):
            try:
                # Generate a unique filename using UUID to prevent collisions
                unique_filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
                
                file.save(upload_path)
                image_filename = unique_filename
            except Exception as e:
                return jsonify(message=f"Error saving image file: {str(e)}"), 500
        elif file.filename != '':
            return jsonify(message="Invalid image file type. Allowed: png, jpg, jpeg, gif."), 400
    
    if not image_filename:
        return jsonify(message="No image file was uploaded."), 400

    try:
        new_recipe = Recipe(
            title=title,
            description=description,
            ingredients=ingredients,
            instructions=instructions,
            creator_id=creator_id,
            image_filename=image_filename
        )
        db.session.add(new_recipe)
        db.session.commit()
        return jsonify(message="Recipe added successfully!", recipe=new_recipe.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        if image_filename and os.path.exists(os.path.join(current_app.config['UPLOAD_FOLDER'], image_filename)):
            os.remove(os.path.join(current_app.config['UPLOAD_FOLDER'], image_filename))
        print(f"Database error during recipe creation: {e}")
        return jsonify(message=f"Error adding recipe to database: {str(e)}"), 500


@recipe_bp.route('/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    """
    Retrieves a single recipe.
    """
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404
    return jsonify(recipe.to_dict()), 200

@recipe_bp.route('/recipes/<int:recipe_id>', methods=['PUT'])
@login_required
def update_recipe(recipe_id):
    """
    Updates an existing recipe.
    """
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404

    if recipe.creator_id != session.get('user_id'):
        return jsonify(message="Unauthorized: You can only update your own recipes."), 403

    recipe.title = request.form.get('title', recipe.title)
    recipe.description = request.form.get('description', recipe.description)
    ingredients_str = request.form.get('ingredients')
    if ingredients_str is not None:
        recipe.ingredients = ingredients_str
    recipe.instructions = request.form.get('instructions', recipe.instructions)

    if 'image' in request.files and request.files['image'].filename != '':
        file = request.files['image']
        if file and allowed_file(file.filename):
            if recipe.image_filename:
                old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], recipe.image_filename)
                if os.path.exists(old_path):
                    os.remove(old_path)

            unique_filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
            upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(upload_path)
            recipe.image_filename = unique_filename
        else:
            return jsonify(message="Invalid image file type. Allowed: png, jpg, jpeg, gif."), 400
    
    if request.form.get('image_removed') == 'true':
        if recipe.image_filename:
            old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], recipe.image_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
            recipe.image_filename = None

    try:
        db.session.commit()
        return jsonify(message="Recipe updated successfully!", recipe=recipe.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Error updating recipe: {str(e)}"), 500

@recipe_bp.route('/recipes/<int:recipe_id>', methods=['DELETE'])
@login_required
def delete_recipe(recipe_id):
    """
    Deletes a recipe.
    """
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404

    if recipe.creator_id != session.get('user_id'):
        return jsonify(message="Unauthorized: You can only delete your own recipes."), 403

    try:
        # Before deleting the recipe, remove it from all users' saved and liked lists
        # This is a key change to handle the db.Table relationship
        for user in recipe.savers.all():
            user.saved_recipes.remove(recipe)
        for user in recipe.likers.all():
            user.liked_recipes.remove(recipe)

        # Delete the associated image file
        if recipe.image_filename:
            image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], recipe.image_filename)
            if os.path.exists(image_path):
                os.remove(image_path)

        db.session.delete(recipe)
        db.session.commit()
        return jsonify(message="Recipe deleted successfully!"), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Error deleting recipe: {str(e)}"), 500

@recipe_bp.route('/recipes', methods=['GET'])
def get_all_recipes():
    """
    Retrieves all recipes from the database.
    """
    recipes = Recipe.query.all()
    return jsonify([recipe.to_dict() for recipe in recipes])

@recipe_bp.route('/recipes/<int:recipe_id>/save', methods=['POST'])
@login_required
def toggle_save_recipe(recipe_id):
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    recipe = Recipe.query.get(recipe_id)
    if not user or not recipe:
        return jsonify(message="User or Recipe not found."), 404

    if recipe in user.saved_recipes:
        user.saved_recipes.remove(recipe)
        db.session.commit()
        return jsonify(message="Recipe unsaved!", saved=False), 200
    else:
        user.saved_recipes.append(recipe)
        db.session.commit()
        return jsonify(message="Recipe saved!", saved=True), 200

@recipe_bp.route('/recipes/<int:recipe_id>/like', methods=['POST'])
@login_required
def toggle_like_recipe(recipe_id):
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    recipe = Recipe.query.get(recipe_id)
    if not user or not recipe:
        return jsonify(message="User or Recipe not found."), 404

    if recipe in user.liked_recipes:
        user.liked_recipes.remove(recipe)
        recipe.likes = max(0, recipe.likes - 1)
        db.session.commit()
        return jsonify(message="Recipe unliked!", liked=False, likes=recipe.likes), 200
    else:
        user.liked_recipes.append(recipe)
        recipe.likes += 1
        db.session.commit()
        return jsonify(message="Recipe liked!", liked=True, likes=recipe.likes), 200

@recipe_bp.route('/my-saved-recipes', methods=['GET'])
@login_required
def get_my_saved_recipes():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found."), 404
    saved_recipes = [recipe.to_dict() for recipe in user.saved_recipes.all()]
    return jsonify(saved_recipes), 200

@recipe_bp.route('/my-liked-recipes-status', methods=['GET'])
@login_required
def get_my_liked_recipes_status():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify(likedRecipeIds=[]), 200
    liked_recipe_ids = [recipe.id for recipe in user.liked_recipes.all()]
    return jsonify(likedRecipeIds=liked_recipe_ids), 200

@recipe_bp.route('/my-saved-recipes-status', methods=['GET'])
@login_required
def get_my_saved_recipes_status():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify(savedRecipeIds=[]), 200
    saved_recipe_ids = [recipe.id for recipe in user.saved_recipes.all()]
    return jsonify(savedRecipeIds=saved_recipe_ids), 200
