# aiohttpdemo_polls/routes.py
from views import index

def setup_routes(app):
    app.router.add_get('/', index) #Pone la ruta

#Pone las rutas para JS, CSS
def setup_static_routes(app):
    app.router.add_static('/static/',
                          path=PROJECT_ROOT / 'static',
                          name='static')