try:
    from flask_wtf import FlaskForm
except ImportError:
    from flask_wtf import Form as FlaskForm

from wtforms import StringField, PasswordField
from wtforms.validators import InputRequired

class UsernamePasswordForm(FlaskForm):
    """docstring for UsernamePasswordForm"""
    username = StringField('username', validators=[InputRequired()])
    password = PasswordField('password', validators=[InputRequired()])
