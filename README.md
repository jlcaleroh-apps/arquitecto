# arquitecto
app para aprender letras

## Trazos de Arquitecto

Juego de trazos para niños: cada trazo (vertical, horizontal, diagonal, círculo, curva y letras) levanta una parte de un edificio en una ciudad que va creciendo.

- Archivo: `index.html` (una sola página, sin instalación).
- Para usarla: abre `index.html` en el navegador (ideal en iPad).
- Solo **mayúsculas** (27, con Ñ), en orden de dificultad: rectas → curvas → diagonales. Al terminar la ciudad, el juego elige siempre las letras menos practicadas.
- La ciudad crece por **manzanas** (9 edificios, pequeña celebración sin parar) y **barrios** (36 edificios por defecto, ~12 min; ajustable en el menú de adultos). Al terminar un barrio hay una gran celebración y la opción de terminar por hoy.
- Aprendizaje indirecto: la voz dice el **nombre del edificio** al empezar y el **nombre de la letra** solo al terminarla. Entre trazos solo suena el sonidito.
- El camino se marca con mini flechas que muestran la dirección del trazo.
- Las indicaciones habladas son cortas para no interrumpir al niño.
- El progreso se guarda en el navegador del dispositivo.

## Sobre la app y el TDAH

Presentación y principios de diseño: https://jlcaleroh-apps.github.io/arquitecto/acerca.html

## Instalar en el iPad (sin internet)

En Safari abre https://jlcaleroh-apps.github.io/arquitecto/ → botón Compartir → **Agregar a pantalla de inicio**. Se abre en pantalla completa y funciona sin conexión (`sw.js` guarda la app; cuando hay internet descarga la versión nueva).

## Pruebas automáticas

`tests/test_app.py` revisa en un navegador real: las 27 letras, que cada edificio empiece con su letra (español e inglés), que ninguna letra salga de su edificio, el orden de los trazos, que las 33 piezas se puedan trazar, el mapa, la voz por idioma, los perfiles y el menú protegido. GitHub las corre solo en cada cambio (pestaña **Actions**).

Local: `pip install playwright && python -m playwright install chromium && python3 tests/test_app.py`

## Componentes comunes (iguales en todas las apps de jlcaleroh-apps)
Esta app sigue el [estándar común](https://github.com/jlcaleroh-apps/plantilla/blob/main/ESTANDAR.md). Las apps nuevas se crean desde [plantilla](https://github.com/jlcaleroh-apps/plantilla).

- **`respaldo.js` · Respaldo del progreso:** en el panel del adulto, "Guardar respaldo" crea un archivo con el progreso de todos los niños (se guarda en Archivos, AirDrop o correo) y "Restaurar respaldo" lo carga en este u otro iPad. Muestra la fecha del último respaldo y avisa si pasaron más de 2 semanas. También pide al iPad que no borre los datos de la app.
  - Es el mismo archivo en todas las apps: si se mejora, se copia igual en cada repo.
  - Cada app declara qué claves de almacenamiento son suyas, porque todas comparten el dominio `jlcaleroh-apps.github.io`.
- **`voz.js` · Prueba de voz:** en el panel del adulto, elegir la voz del iPad para cada idioma, ajustar la velocidad y escuchar ejemplos de la app. Donde aplica, permite grabar tu propia voz para letras, sílabas o palabras sueltas; las grabaciones viajan en el respaldo.
- **`adulto.js` · Gesto del panel del adulto:** mantener presionado 2 segundos; el botón se llena de color y, si se suelta antes, aparece un aviso. Así los niños no lo abren por accidente.
- **`pantalla.js` · Pantalla encendida:** mientras el niño toca la pantalla, el iPad no se apaga; tras 3 minutos sin actividad se suelta para cuidar la batería.
- **`apps.js` · Otras apps:** en la ventana de información, enlaces a las demás apps de la colección (Robot Sílabo, Trazos de Arquitecto, Números, Mi Rutina) para que los padres conozcan las otras. Al crear una app nueva se agrega a su lista y se copia igual en todos los repos.

## Contacto
jlcaleroh@gmail.com
