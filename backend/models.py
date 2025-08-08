# models.py
import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy_serializer import SerializerMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

user_saved_recipes = db.Table(
    'user_saved_recipes',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('recipe_id', db.Integer, db.ForeignKey('recipe.id'), primary_key=True)
)

user_liked_recipes = db.Table(
    'user_liked_recipes',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('recipe_id', db.Integer, db.ForeignKey('recipe.id'), primary_key=True)
)

class User(db.Model, SerializerMixin):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    saved_recipes = db.relationship(
        'Recipe',
        secondary=user_saved_recipes,
        backref=db.backref('savers', lazy='dynamic'),
        lazy='dynamic'
    )

    liked_recipes = db.relationship(
        'Recipe',
        secondary=user_liked_recipes,
        backref=db.backref('likers', lazy='dynamic'),
        lazy='dynamic'
    )

    created_recipes = db.relationship(
        'Recipe',
        backref='creator',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.email}>'

class Recipe(db.Model, SerializerMixin):
    __tablename__ = 'recipe'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    ingredients = db.Column(db.Text, nullable=True)
    instructions = db.Column(db.Text, nullable=False)
    image_filename = db.Column(db.String(255), nullable=True)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    # Foreign key to link recipe to its creator
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    serialize_only = ('id', 'title', 'description', 'ingredients', 'instructions', 'image_filename', 'likes', 'created_at', 'creator_id')

    def to_dict(self):
        # Override to_dict to handle ingredients as a list
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'ingredients': [i.strip() for i in self.ingredients.split(',')] if self.ingredients else [],
            'instructions': self.instructions,
            'image_filename': self.image_filename,
            'likes': self.likes,
            'created_at': self.created_at.isoformat(),
            'creatorId': self.creator_id,
            'creatorEmail': self.creator.email
        }
    
    def __repr__(self):
        return f'<Recipe {self.title}>'
