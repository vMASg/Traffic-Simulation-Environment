# Traffic Simulation Environment - Server

## Instalación

La parte del servidor de este proyecto requiere Python 2.7 y pip. Para instalar todos los requisitos del servidor basta con ejecutar:

 ```batch
 > pip install -r requirements.txt
 ```

## Estructura

### External

En el directorio external se encuentran los códigos que se ejecutan fuera del contexto de la aplicación (i.e en un proceso externo). Estos incluyen los que se ejecutan desde el proceso de Aimsun o desde el intérprete de Python.

### Resources

En este directorio se encuentran los recursos que serán el punto de entrada a la aplicación según lo definido en la API y en el ``app_starter.py``.

### Services

Se definen los servicios que se usan en la aplicación.
