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

class ConfigSetupForm(FlaskForm):
    """docstring for ConfigSetupForm"""
    basepath = StringField('basepath', validators=[InputRequired()])
    aconsole = StringField('aconsole', validators=[InputRequired()])
    git_path = StringField('git_path', validators=[InputRequired()])
    pythondir = StringField('pythondir', validators=[InputRequired()])
    secret_k = PasswordField('secret_k', validators=[InputRequired()])
    adminpass = PasswordField('adminpass', validators=[InputRequired()])
