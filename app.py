import flask
import os

app = flask.Flask(__name__)

@app.route('/')
def index():
    return "Hello, World 2!"