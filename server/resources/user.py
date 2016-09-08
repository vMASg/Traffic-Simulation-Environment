from flask_login import UserMixin
from server.app_starter import sql_alchemy_db as db
from sqlalchemy.ext.hybrid import hybrid_property

class User(UserMixin, db.Model):
    "Based on http://exploreflask.com/en/latest/users.html"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(128, convert_unicode=True), unique=True)
    email = db.Column(db.String(128), unique=True)
    _password = db.Column('password', db.String(128))
    is_active = db.Column(db.Boolean(), default=False)

    def __init__(self, username, email, password, is_active=False):
        self.username = username
        self.email = email
        self._password = User.bcrypt.generate_password_hash(password)
        # self.is_authenticated = False
        self.is_active = is_active
        # self.is_anonymous = False

    @hybrid_property
    def password(self):
        return self._password

    @password.setter
    def _set_password(self, plaintext):
        self._password = User.bcrypt.generate_password_hash(plaintext)

    def password_matches(self, plaintext):
        return User.bcrypt.check_password_hash(self._password, plaintext)

    def get_id(self):
        return unicode(self.id)
