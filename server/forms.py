try:
    from flask_wtf import FlaskForm
except ImportError:
    from flask_wtf import Form as FlaskForm

from wtforms import StringField, PasswordField
from wtforms.validators import InputRequired, Email, EqualTo, Length

class UsernamePasswordForm(FlaskForm):
    """docstring for UsernamePasswordForm"""
    username = StringField('username', validators=[InputRequired()])
    password = PasswordField('password', validators=[InputRequired()])

class RegistrationForm(FlaskForm):
    """docstring for RegistrationForm"""
    username = StringField('username', validators=[InputRequired(), Length(max=128)])
    email = StringField('email', validators=[InputRequired(), Email(), Length(max=128)])
    password = PasswordField('password', validators=[InputRequired()])
    confirm = PasswordField('confirm', validators=[EqualTo('password', message='Passwords must match')])
