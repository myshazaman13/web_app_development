from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class UserRecipe(db.Model):
    __tablename__ = 'user_recipes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    saved_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Define relationships
    user = db.relationship('User', backref=db.backref('saved_recipes_links', lazy=True))
    recipe = db.relationship('Recipe', backref=db.backref('saved_by_users_links', lazy=True))

    def __repr__(self):
        return f"<UserRecipe user_id={self.user_id} recipe_id={self.recipe_id}>"

# Association table for many-to-many: Users and Recipes (Liked)
class UserLikedRecipe(db.Model):
    __tablename__ = 'user_liked_recipes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    liked_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Define relationships
    user = db.relationship('User', backref=db.backref('liked_recipes_links', lazy=True))
    recipe = db.relationship('Recipe', backref=db.backref('liked_by_users_links', lazy=True))

    def __repr__(self):
        return f"<UserLikedRecipe user_id={self.user_id} recipe_id={self.recipe_id}>"


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships for saved and liked recipes
    # These will provide direct access to the Recipe objects
    saved_recipes = db.relationship(
        'Recipe', secondary='user_recipes', lazy='dynamic',
        backref=db.backref('savers', lazy=True)
    )
    liked_recipes = db.relationship(
        'Recipe', secondary='user_liked_recipes', lazy='dynamic',
        backref=db.backref('likers', lazy=True)
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    ingredients = db.Column(db.Text, nullable=False) # Stored as comma-separated string or JSON string
    instructions = db.Column(db.Text, nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    likes_count = db.Column(db.Integer, default=0) # Renamed to avoid conflict with 'likes' relationship if added
    image_filename = db.Column(db.String(255), nullable=True) # New column for image filename

    creator = db.relationship('User', backref=db.backref('recipes', lazy=True))

    def __repr__(self):
        return f"<Recipe {self.title}>"

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'ingredients': self.ingredients.split(',') if self.ingredients else [], # Convert back to list
            'instructions': self.instructions,
            'creatorId': self.creator_id,
            'creatorEmail': self.creator.email if self.creator else 'Unknown',
            'createdAt': self.created_at.isoformat(),
            'likes': self.likes_count,
            'imageFilename': self.image_filename # Include image filename
        }
