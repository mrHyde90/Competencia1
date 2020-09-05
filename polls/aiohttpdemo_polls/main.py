# aiohttpdemo_polls/main.py
from aiohttp import web #Framework 
import aiohttp_jinja2 #para poder poner jinja
import jinja2 #El web engine

from settings import config, BASE_DIR #importa la configuracion y el directorioa base
from routes import setup_routes #importa las rutas
from db import close_pg, init_pg #Importa los metodos de la base de datos
from middlewares import setup_middlewares #Importa los middlewares

app = web.Application() #application
app['config'] = config #Pone la configuracion
#setea el engine para la pagina
aiohttp_jinja2.setup(app,
    loader=jinja2.FileSystemLoader(str(BASE_DIR / 'aiohttpdemo_polls' / 'templates')))
setup_routes(app) #pone las rutas
setup_middlewares(app) #Pone los middlewares
app.on_startup.append(init_pg) #Inicia la base de datos
app.on_cleanup.append(close_pg) #Cierra la base de datos cuando se cierra la app
web.run_app(app) #Corre la app