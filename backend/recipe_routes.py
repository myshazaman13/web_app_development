# recipe_routes.py
from flask import Blueprint, request, jsonify, session, current_app
from models import db, Recipe, User, UserRecipe, UserLikedRecipe
from auth_routes import login_required # Import the login_required decorator
from werkzeug.utils import secure_filename # For secure filename handling
import os # For path manipulation

recipe_bp = Blueprint('recipe', __name__)

def allowed_file(filename):
    # Check if a file extension exists and if it's in the allowed set
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@recipe_bp.route('/recipes', methods=['GET'])
def get_all_recipes():
    recipes = Recipe.query.all()
    return jsonify([recipe.to_dict() for recipe in recipes]), 200

@recipe_bp.route('/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404
    return jsonify(recipe.to_dict()), 200

@recipe_bp.route('/recipes', methods=['POST'])
@login_required # Only logged-in users can add recipes
def add_recipe():
    # Use request.form for text data and request.files for file data
    title = request.form.get('title')
    description = request.form.get('description')
    ingredients_str = request.form.get('ingredients') # Will be a comma-separated string from frontend
    instructions = request.form.get('instructions')
    creator_id = session.get('user_id')
    
    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        # Check if a file was actually selected and has an allowed extension
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Prepend a unique identifier to prevent collisions
            unique_filename = f"{os.urandom(8).hex()}_{filename}"
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))
            image_filename = unique_filename
        elif file.filename == '': # If file input was present but no file selected
            pass # No image to upload
        else: # Invalid file type
            return jsonify(message="Invalid image file type. Allowed: png, jpg, jpeg, gif."), 400


    if not all([title, description, ingredients_str, instructions, creator_id]):
        # Check if ingredients_str is empty after stripping whitespace, if it's required
        # For simplicity, we'll assume it's always provided by the form
        return jsonify(message="Missing required fields (title, description, ingredients, instructions)."), 400

    new_recipe = Recipe(
        title=title,
        description=description,
        ingredients=ingredients_str,
        instructions=instructions,
        creator_id=creator_id,
        image_filename=image_filename # Save the filename
    )
    db.session.add(new_recipe)
    db.session.commit()
    return jsonify(message="Recipe added successfully!", recipe=new_recipe.to_dict()), 201

@recipe_bp.route('/recipes/<int:recipe_id>', methods=['PUT'])
@login_required # Only logged-in users can update recipes
def update_recipe(recipe_id):
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404

    # Ensure only the creator can update
    if recipe.creator_id != session.get('user_id'):
        return jsonify(message="Unauthorized: You can only update your own recipes."), 403

    # Use request.form for text data and request.files for file data
    data = request.form # Get form data
    
    recipe.title = data.get('title', recipe.title)
    recipe.description = data.get('description', recipe.description)
    ingredients_str = data.get('ingredients')
    if ingredients_str is not None:
        recipe.ingredients = ingredients_str
    recipe.instructions = data.get('instructions', recipe.instructions)

    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '' and allowed_file(file.filename):
            # Delete old image if it exists
            if recipe.image_filename:
                old_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], recipe.image_filename)
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)
            
            filename = secure_filename(file.filename)
            unique_filename = f"{os.urandom(8).hex()}_{filename}"
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))
            recipe.image_filename = unique_filename
        elif file.filename == '': # User submitted empty file input, might mean they want to remove image
             # This logic depends on frontend's intent for empty file input
             pass # For now, do nothing if empty file input
        else: # Invalid file type
            return jsonify(message="Invalid image file type. Allowed: png, jpg, jpeg, gif."), 400
    elif 'image_removed' in data and data['image_removed'].lower() == 'true':
        # Frontend explicitly signaled image removal
        if recipe.image_filename:
            old_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], recipe.image_filename)
            if os.path.exists(old_image_path):
                os.remove(old_image_path)
            recipe.image_filename = None


    db.session.commit()
    return jsonify(message="Recipe updated successfully!", recipe=recipe.to_dict()), 200

@recipe_bp.route('/recipes/<int:recipe_id>', methods=['DELETE'])
@login_required # Only logged-in users can delete recipes
def delete_recipe(recipe_id):
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404

    # Ensure only the creator can delete
    if recipe.creator_id != session.get('user_id'):
        return jsonify(message="Unauthorized: You can only delete your own recipes."), 403

    # Delete associated saved and liked entries first to maintain integrity
    UserRecipe.query.filter_by(recipe_id=recipe_id).delete()
    UserLikedRecipe.query.filter_by(recipe_id=recipe_id).delete()

    # Delete the associated image file if it exists
    if recipe.image_filename:
        image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], recipe.image_filename)
        if os.path.exists(image_path):
            os.remove(image_path)

    db.session.delete(recipe)
    db.session.commit()
    return jsonify(message="Recipe deleted successfully!"), 200

@recipe_bp.route('/recipes/<int:recipe_id>/save', methods=['POST'])
@login_required # Only logged-in users can save recipes
def toggle_save_recipe(recipe_id):
    user_id = session.get('user_id')
    
    # Check if recipe exists
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404

    saved_link = UserRecipe.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()

    if saved_link:
        db.session.delete(saved_link)
        db.session.commit()
        return jsonify(message="Recipe unsaved!", saved=False), 200
    else:
        new_save = UserRecipe(user_id=user_id, recipe_id=recipe_id)
        db.session.add(new_save)
        db.session.commit()
        return jsonify(message="Recipe saved!", saved=True), 200

@recipe_bp.route('/recipes/<int:recipe_id>/like', methods=['POST'])
@login_required # Only logged-in users can like recipes
def toggle_like_recipe(recipe_id):
    user_id = session.get('user_id')

    # Check if recipe exists
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify(message="Recipe not found."), 404

    liked_link = UserLikedRecipe.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()

    if liked_link:
        db.session.delete(liked_link)
        recipe.likes_count = max(0, recipe.likes_count - 1) # Decrement like count
        db.session.commit()
        return jsonify(message="Recipe unliked!", liked=False, likes=recipe.likes_count), 200
    else:
        new_like = UserLikedRecipe(user_id=user_id, recipe_id=recipe_id)
        db.session.add(new_like)
        recipe.likes_count += 1 # Increment like count
        db.session.commit()
        return jsonify(message="Recipe liked!", liked=True, likes=recipe.likes_count), 200

@recipe_bp.route('/my-saved-recipes', methods=['GET'])
@login_required # Only logged-in users can view their saved recipes
def get_my_saved_recipes():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found."), 404

    # Access through the relationship defined in User model
    saved_recipes = [recipe.to_dict() for recipe in user.saved_recipes.all()]
    return jsonify(saved_recipes), 200

@recipe_bp.route('/my-liked-recipes-status', methods=['GET'])
@login_required
def get_my_liked_recipes_status():
    user_id = session.get('user_id')
    liked_recipe_ids = [link.recipe_id for link in UserLikedRecipe.query.filter_by(user_id=user_id).all()]
    return jsonify(likedRecipeIds=liked_recipe_ids), 200

@recipe_bp.route('/my-saved-recipes-status', methods=['GET'])
@login_required
def get_my_saved_recipes_status():
    user_id = session.get('user_id')
    saved_recipe_ids = [link.recipe_id for link in UserRecipe.query.filter_by(user_id=user_id).all()]
    return jsonify(savedRecipeIds=saved_recipe_ids), 200
