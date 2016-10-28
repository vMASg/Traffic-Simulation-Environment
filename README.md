# Traffic Simulation Environment

## Instalación de dependencias - servidor

La parte del servidor de este proyecto requiere Python 2.7 y pip. Para instalar todos los requisitos del servidor basta con ejecutar:

 ```batch
 > pip install -r requirements.txt
 ```

Es necesario también tener instalado el *Microsoft Visual C++ Compiler for Python*.

## Instalación de dependencias - cliente

La parte del cliente de este proyecto requiere nodejs y bower para instalar dependencias. Basta con ejecutar:
 
 ```batch
 > bower install
 ```


## Configuración

Antes de la primera ejecución, en ``server/constants.py`` se deben definir las siguientes constantes:

 - **BASE_PATH**: Path a partir del cual se generará la estructura de directorios y repositorios para guardar todos los recursos de la aplicación.
 - **ACONSOLE_PATH**: Path al fichero ``aconsole.exe`` de Aimsun.
 - **GIT_PATH**: Path al fichero ``git.exe``.
 - **PYTHON_DIR**: Directorio donde se ha instalado Python (no el directorio *bin*).
 - **SECRET_KEY**: Clave para Flask necesaria para usar sesiones. [Más info][flask]
 - **ADMIN_PASSWORD**: Password del usuario administrador ``Admin``.

## Ejecución

Para iniciar el servidor se debe ejecutar el fichero ``server.py``:
 
 ```batch
 > python server.py
 ```

La primera vez que se inicie el entorno:
 1. Se creará la estructura de directorios, si no existe.
 2. Se iniciarán los repositorios Git, si no existe alguno.
 3. Se crearán los ``.gitignore`` necesarios.
 4. Se añadirán los ficheros de los directorios, si los hubiera, junto con los ``.gitignore`` en repositorios al commit inicial.
 5. Se creará la base de datos.
 6. Se creará en la base de datos el usuario ``Admin``.


[flask]: http://flask.pocoo.org/docs/0.11/config/
