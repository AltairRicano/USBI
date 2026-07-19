Requisitos funcionales

Registro, autenticación y seguridad de la cuenta 

RF1. El jugador debe poder registrar una cuenta nueva ingresando su correo o teléfono y contraseña  para obtener una cuenta de jugador creada en el sistema. 

RF2. El sistema debe solicitar al jugador que repita la nueva contraseña (campo de confirmación) durante el registro y en cualquier cambio de contraseña, verificando que ambas coincidan antes de almacenarla. 

RF3. Antes de completar el registro, el sistema mostrará el Aviso de Privacidad en una ventana legible y solicitará al usuario que marque una casilla de “He leído y acepto el Aviso de Privacidad” para otorgar su consentimiento informado y continuar. 

RF4. El sistema debe encriptar las contraseñas procesando la cadena de texto ingresada en el registro para almacenar únicamente el hash de seguridad en la base de datos. 

RF5. El sistema encriptará en reposo los datos personales de contacto y representación legal (correo electrónico, número de teléfono y contacto del tutor) en la base de datos, utilizando algoritmos de cifrado robusto, de manera complementaria al hash de las contraseñas. 

RF6. El jugador debe poder iniciar sesión en la plataforma ingresando sus credenciales (correo/teléfono y contraseña) para acceder al módulo de jugador y cargar su perfil. 

RF7. El jugador debe poder modificar sus datos de inicio de sesión ingresando sus nuevas credenciales para mantener los datos de su cuenta actualizados en la base de datos. 

RF8. El jugador podrá eliminar su cuenta de forma permanente desde la configuración de perfil. Esta acción borrará todos sus datos personales (correo, teléfono, contraseña, preferencias y progreso) de la base de datos, sin posibilidad de recuperación. 

Preferencias y perfil del jugador 

RF9. El jugador debe poder seleccionar sus preferencias de contenido indicando sus temas y tipos de minijuegos favoritos para visualizar una interfaz principal personalizada en su primer inicio. 

RF10. El jugador debe poder visualizar su perfil y progreso interactuando con la interfaz para acceder a una pantalla con niveles superados, juegos preferidos, nivel actual, experiencia e insignias. 

Sistema de experiencia, racha y rangos (general) 

RF11. El sistema calculará la experiencia base de cada nivel como 4 puntos multiplicados por el número de dificultad (dificultad 1 = 4 pt, dificultad 2 = 8 pt, …, dificultad 10 = 40 pt). 

RF12. El sistema debe otorgar puntos de experiencia basándose en el resultado de la partida oficial y el nivel de dificultad para sumar experiencia al progreso del jugador y actualizar su rango. 

RF13. El sistema debe actualizar la racha diaria utilizando la fecha de la partida oficial finalizada para incrementar el contador e incentivar la retención del jugador. 

RF14. El sistema debe calcular el rango o insignia del jugador sumando los puntos de experiencia totales acumulados para desbloquear automáticamente el siguiente título visual en su perfil. 

RF15. El jugador debe poder reintentar un nivel oficial fallido o completado presionando el botón de repetición para reiniciar la partida, limitando la cantidad de experiencia extra otorgada en cada nivel para evitar abusos a un 50% en los primeros dos reintentos del día, y a 0% en los siguientes. 

Material educativo previo 

RF16. El jugador debe poder visualizar material educativo (Aprende) seleccionando el artículo o infografía dentro de una sección para leer la información de divulgación antes de iniciar los minijuegos. 

Juego y control de partida 

RF17. El jugador debe poder jugar un nivel oficial seleccionándolo desde una sección temática para iniciar la partida con las mecánicas correspondientes al minijuego. 

RF18. El jugador debe poder pausar una partida en curso presionando el botón de pausa para detener el tiempo y bloquear temporalmente las mecánicas del juego. 

Módulo de administración – Plantillas, niveles oficiales y secciones 

RF19. El sistema debe proporcionar 7 plantillas de minijuego (Trivia, Rompecabezas, Sopa de Letras, Fake News, Crucigrama, Memorama, Serpientes y Escaleras) accesibles tanto para el Administrador (niveles oficiales) como para el Jugador en el Maker (niveles de comunidad). 

RF20. El administrador debe poder crear un nivel oficial usando una plantilla predefinida, el título, color de fondo, contenido del juego y dificultad (1 al 10) para publicar el nivel directamente en la base de datos oficial. 

RF21. El administrador debe poder agrupar niveles oficiales asignando un título de temática (ej. "Aprende de salud mental") y seleccionando los niveles para generar una nueva sección temática visible en el módulo de jugadores. 

RF22. El administrador debe poder crear un nivel desde una sección presionando el botón de "crear nivel" dentro de la sección para obtener un nivel nuevo generado que hereda automáticamente el color de la sección contenedora. 

RF23. El administrador debe poder asignar una sección a un nivel nuevo utilizando el menú desplegable o barra de búsqueda en el panel general para que el nivel quede vinculado correctamente a la sección seleccionada al crearlo desde el inicio. 

RF24. El administrador debe poder confirmar el esquema de color del nivel mediante una ventana emergente de confirmación (mantener personalizado o aplicar el de la sección) para que el color final del nivel sea aplicado según la elección. 

RF25. El administrador debe poder editar un nivel oficial modificando sus atributos (título, fondo, contenido, dificultad) para actualizar la información mostrada a los jugadores sin perder el identificador original del nivel. 

RF26. El administrador debe poder eliminar un nivel o sección oficial mediante su identificador para retirar el contenido de la vista pública conservando intacta la experiencia obtenida por los jugadores históricamente. 

RF27. El administrador debe poder copiar una sección completa presionando el botón de "copiar sección" e ingresando un nuevo nombre para obtener una sección duplicada con todos sus niveles internos bajo un nombre distinto. Para esto se creará un nuevo id de sección y para cada uno de los niveles una vez terminado de crear. 

RF28. El administrador debe poder copiar un nivel existente presionando el botón de "copiar nivel" e ingresando una nueva sección destino para abrir el creador de niveles (Maker) con los datos del nivel original precargados listos para edición. Esto le dará un nuevo id una vez terminado de crear el nivel. 

RF29. El administrador debe poder visualizar métricas básicas accediendo al panel de administración para conocer la cantidad de secciones creadas y el volumen de actividad general en la plataforma. 

Módulo Maker (jugador) – Creación y uso de niveles comunitarios 

RF30. El jugador debe poder crear un nivel de comunidad en el módulo Maker seleccionando una plantilla predefinida, título, color de fondo, contenido del juego y dificultad para generar un nivel local sin afectar la base de datos oficial. 

RF31. El jugador debe poder probar un nivel de comunidad en el Maker antes de exportarlo presionando el botón de prueba para validar localmente que las mecánicas y atributos funcionen correctamente. 

RF32. El jugador debe poder exportar un nivel de comunidad generado en el Maker mediante el botón de descarga para obtener un archivo local en formato JSON. 

RF33. El jugador debe poder importar un nivel de comunidad subiendo un archivo en formato JSON para cargar el nivel en su entorno de juego y poder interactuar con él. 

RF34. El sistema debe omitir el registro de progreso al finalizar un nivel importado (JSON) para que el juego se complete sin alterar la racha diaria, insignias ni la experiencia del jugador. 

RF35. El sistema debe mantener los niveles del Maker y archivos JSON importados exclusivamente en el almacenamiento local del dispositivo para que no se transfieran ni sincronicen con el servidor. 

RF36. El sistema debe validar la estructura y los tipos de datos del archivo JSON importado contra un esquema estricto de seguridad, rechazando la importación si el archivo contiene campos no reconocidos, código malicioso, valores fuera de los rangos permitidos o un peso superior a 5 MB.

Mecánicas por plantilla – Trivia 

RF37. El administrador debe poder configurar un nivel de Trivia ingresando el título, la dificultad (1 al 10) y el color de fondo para crear la estructura base del nivel de Trivia. 

RF38. El administrador debe poder agregar una pregunta de Trivia introduciendo el texto de la pregunta y el texto de 4 opciones (A, B, C, D) para añadir la pregunta con sus cuatro incisos al banco del nivel. 

RF39. El administrador debe poder seleccionar la respuesta correcta de Trivia utilizando el menú desplegable debajo de los incisos para dejar la respuesta correcta asignada sin errores de tipado o formato. 

RF40. El administrador debe poder eliminar una pregunta u opción de Trivia presionando el botón de eliminación para que el elemento sea removido del nivel permanentemente. 

Mecánicas por plantilla – Rompecabezas 

RF41. El administrador debe poder configurar un nivel de Rompecabezas ingresando el título, la dificultad, una frase larga o concepto y el número de cortes (mínimo 4) para dejar el nivel de Rompecabezas guardado en la base de datos. 

RF42. El sistema debe generar tarjetas de Rompecabezas procesando la frase fragmentada y realizando una asignación automática de colores distintos para mostrar tarjetas visuales desordenadas listas para que el jugador les dé coherencia. 

RF43. En el Rompecabezas, el jugador podrá arrastrar cada fragmento de frase (tarjeta) con el mouse o con el dedo en pantallas táctiles y soltarlo en la posición deseada para ordenar la secuencia y reconstruir el texto correcto. 

Mecánicas por plantilla – Sopa de Letras 

RF44. El administrador debe poder añadir una palabra de Sopa de Letras ingresando el texto de la palabra para que quede registrada en la lista del nivel con la opción inmediata de ser eliminada. 

RF45. El sistema debe generar el tablero de Sopa de Letras procesando la lista de palabras del nivel para mostrar una cuadrícula autogenerada con palabras aleatorias en horizontal/vertical y relleno de letras basura. 

RF46. En la Sopa de Letras, el jugador podrá seleccionar una palabra presionando sobre su primera o última letra y arrastrando el puntero (mouse o dedo) a lo largo de toda la palabra hasta la letra final. 

RF47. El sistema validará la selección de la Sopa de Letras: si la palabra es correcta, la marcará permanentemente con un color resaltado; si es incorrecta, teñirá la selección de azul por un segundo, reproducirá un tono breve de error y eliminará la selección por completo. 

Mecánicas por plantilla – Fake News 

RF48. El administrador debe poder configurar una nota de Fake News ingresando el título, dificultad, color, imagen (opcional), referencia de imagen (opcional), texto de la nota y referencia de la nota (obligatoria) para tener el contenido de la noticia estructurado y guardado en el nivel. 

RF49. El administrador debe poder clasificar una nota de Fake News utilizando el selector ("Noticia real" o "Fake new") para dejar la veracidad de la noticia asignada en el sistema. 

RF50. El sistema debe calcular la experiencia de Fake News evaluando el porcentaje de notas acertadas y la dificultad del nivel para otorgar al jugador una cantidad de puntos de experiencia proporcionales. El resultado será la experiencia asignada al nivel multiplicada por el porcentaje de aciertos. 

Mecánicas por plantilla – Crucigrama 

RF51. El administrador debe poder añadir un concepto de Crucigrama ingresando una palabra única (concepto) y el texto de su descripción para que el par sea añadido a la lista del nivel. 

RF52. El sistema debe generar el tablero de Crucigrama procesando la lista de conceptos del administrador para mostrar una cuadrícula autogenerada, procurando una distribución equilibrada de palabras horizontales y verticales cruzadas en letras coincidentes. 

RF53. En el Crucigrama, el jugador podrá tocar o hacer clic en una celda numerada perteneciente a un concepto y luego teclear la palabra directamente desde la primera letra hasta la última. En dispositivos móviles se desplegará automáticamente el teclado táctil para la entrada. 

RF54. Cuando una celda del Crucigrama sea intersección de dos palabras (horizontal y vertical), el sistema otorgará prioridad a la palabra vertical, iniciando el llenado de letras en esa orientación al seleccionar la celda. 

Mecánicas por plantilla – Memorama 

RF55. El administrador debe poder configurar una tarjeta de Memorama ingresando el texto del concepto, el texto de la descripción y usando el selector de color individual para obtener un par de tarjetas vinculadas lógicamente por color y contenido. 

RF56. El administrador debe poder asignar los colores de Memorama accionando el botón de "Elegir colores al azar" para que se apliquen colores diferentes automáticamente a todos los pares del nivel. 

RF57. El sistema debe validar la creación del Memorama evaluando el conteo total de conceptos ingresados para guardar el nivel solo si cuenta con el mínimo requerido de 4 pares. 

Mecánicas por plantilla – Serpientes y Escaleras 

RF58. El administrador debe poder configurar el tablero de Serpientes y Escaleras ingresando el título, dificultad, color, cantidad de serpientes, cantidad de escaleras y cantidad de casillas para guardar los parámetros geométricos y de obstáculos del tablero. 

RF59. El sistema debe generar el tablero de Serpientes y Escaleras procesando los parámetros numéricos del administrador para renderizar el tablero dispersando aleatoriamente serpientes (que conectan a una casilla de menor valor) y escaleras (que conectan a una casilla de mayor valor), permitiendo saltos de múltiples filas sin tocar las casillas de inicio o meta. 

RF60. El administrador debe poder añadir una pregunta de Serpientes y Escaleras ingresando el texto de la pregunta, 2 opciones de respuesta y usando el selector de respuesta correcta para añadir la pregunta binaria al banco del nivel. 

RF61. El jugador debe poder tirar el dado (D6) en Serpientes y Escaleras contestando correctamente la pregunta en turno para obtener un avance de casillas correspondiente al número del dado. En caso de no contestar correctamente no se le dará la oportunidad de tirar. 

RF62. La máquina debe tirar el dado (D6) en Serpientes y Escaleras ejecutando su turno automático tras una respuesta del jugador para generar un avance aleatorio de su ficha en el tablero. La computadora siempre tiene oportunidad de tirar. 

RF63. El sistema debe reciclar las preguntas de Serpientes y Escaleras evaluando el registro de preguntas falladas por el jugador para que las preguntas erradas vuelvan a la cola de turnos en caso de que se agote el banco principal. 

RF64. El sistema debe declarar empate técnico en Serpientes y Escaleras evaluando si el banco de preguntas está completamente agotado (incluyendo recicladas) para desplegar una pantalla de aviso y otorgar la mitad de la experiencia al jugador. 

RF65. El sistema debe otorgar la victoria en Serpientes y Escaleras detectando si la ficha del jugador o de la máquina llega a la meta final para dar el 100% de experiencia si gana el jugador, o 0% de experiencia si gana la máquina. 

Sincronización y comportamiento offline (aplicación de escritorio) 

RF66. El sistema debe mostrar un indicador de conectividad detectando el estado de la red local para informar al usuario de la aplicación de escritorio si está operando en modo offline o en línea. 

RF67. La aplicación de escritorio debe sincronizar el progreso local al detectar conexión a internet enviando los datos de actividad offline para actualizar la base de datos del host de la USBI. 

RF68. La aplicación de escritorio debe verificar la conectividad cada 60 segundos al detectar conexión a internet para ejecutar la sincronización en segundo plano según los requisitos 69 al 72, posponiéndola si hay una partida en curso hasta que esta finalice. 

RF69. Durante la sincronización entre la aplicación de escritorio y el servidor, el sistema cifrará toda la información transmitida (experiencia, niveles, racha, datos personales) utilizando TLS 1.2 o superior para protegerla contra accesos no autorizados. 

RF70. El sistema debe sumar directamente la experiencia offline acumulada con la experiencia online del servidor al sincronizar para reflejar el total unificado en el perfil del jugador. 

RF71. El sistema debe unificar los niveles superados offline y online al sincronizar para marcar como completado todo nivel oficial que aparezca en cualquiera de los dos entornos. 

RF72. El sistema debe unificar las insignias obtenidas offline y online al sincronizar para conservar todas las insignias de ambos entornos sin eliminar ninguna. 

RF73. El sistema debe reconstruir la racha diaria al sincronizar usando la lista combinada de fechas con actividad de ambos entornos para calcular la secuencia más larga de días consecutivos y actualizar el contador.


Requisitos no funcionales

**RNF1. Rendimiento y peso**  
La aplicación de escritorio completa (instalador + datos locales iniciales) no debe exceder los **3 GB** en disco, para evitar saturación del hosting (Hostinger) y funcionar en equipos con recursos limitados.

**RNF2. Tiempo de carga**  
La interfaz web y de escritorio debe mostrar la pantalla principal en **menos de 3 segundos** en conexiones de banda ancha (≥5 Mbps) y en menos de 5 segundos en conexiones móviles 3G, medido desde el login o desde el inicio si no requiere autenticación.

**RNF3. Compatibilidad de hardware**  
El juego debe ejecutarse sin degradación perceptible en equipos con al menos **4 GB de RAM**, procesador de dos núcleos a 1.8 GHz y resolución de pantalla de 1366×768 píxeles, así como en dispositivos táctiles (tablets) con pantallas de 8 pulgadas o más.

**RNF4. Compatibilidad de navegadores (módulo web)**  
El módulo web debe ser funcional en las dos últimas versiones estables de: Chrome, Firefox, Edge, Safari (macOS/iPadOS) y navegadores basados en Chromium en Android.

**RNF5. Accesibilidad visual**

- Todo texto no decorativo debe tener un **tamaño mínimo de 14 píxeles** (o equivalente escalable en em/rem).
    
- La interfaz debe permitir el **zoom hasta 200%** sin pérdida de funcionalidad ni superposición de elementos.
    
- El contraste de color entre texto y fondo debe cumplir al menos el **nivel AA de WCAG 2.1** (relación de contraste 4.5:1 para texto normal).
    
- Para usuarios con daltonismo, además del color, se usarán **patrones, iconos o etiquetas textuales** para diferenciar estados (ej. tarjetas de memorama con rayas/puntos como alternativa al color).
    

**RNF6. Navegación por teclado**  
Todas las funciones del juego (botones, menús, selección de opciones, arrastre en rompecabezas mediante teclas alternativas) deben ser accesibles mediante teclado estándar (tabulador, enter, flechas) siguiendo las pautas WCAG 2.1 nivel A.

**RNF7. Toques y gestos táctiles**  
En pantallas táctiles (incluyendo la app de escritorio en modo táctil), los gestos de arrastre para sopa de letras y rompecabezas deben responder con una **latencia menor a 100 ms** y ser compatibles con eventos táctiles estándar (touchstart, touchmove, touchend).

**RNF8. Consistencia visual**  
Los colores principales serán **verde, blanco y azul** (colores institucionales de la Universidad Veracruzana). El rojo solo podrá usarse en mensajes de error breves o en notificaciones de fallo, no como color predominante. Se permitirá una paleta secundaria de colores de alto contraste para elementos de juego, siempre que no genere confusión.

**RNF9. Seguridad de sesión**  
El token de autenticación (JWT o similar) tendrá una **validez máxima de 8 horas** y se almacenará de forma segura (httpOnly en web, almacenamiento cifrado en escritorio). Al cerrar sesión (RNF funcional propuesto RF75), el token se revocará inmediatamente.

**RNF10. Tolerancia a fallos de red**  
La aplicación de escritorio, al perder la conexión, debe continuar funcionando sin errores y mostrar un **indicador de modo offline** en un lugar visible. Al recuperar la red, la sincronización debe intentarse automáticamente y no bloquear la interacción del usuario.

**RNF11. Integridad de la sincronización**  
Durante la sincronización offline → online, si ocurre un error de red o servidor, el sistema **reintentará hasta 3 veces** con un retroceso exponencial (1s, 2s, 4s). Si falla, guardará el progreso local y lo intentará en la siguiente ventana de conectividad.

**RNF12. Escalabilidad de la base de datos oficial**  
El diseño de la base de datos debe soportar al menos **10,000 usuarios registrados** y **5,000 niveles oficiales** sin degradación significativa en consultas de progreso o creación de niveles.

**RNF13. Mantenibilidad del código**  
El código del juego (web, administración, escritorio) debe seguir los principios de **componentes reutilizables** en React/TypeScript, con una carpeta común de lógica compartida (modelos, utilerías, validación de JSON) para evitar duplicación entre plataformas.

**RNF14. Registro anónimo de errores (opcional)**  
La aplicación de escritorio podrá (previa autorización del usuario) enviar registros de error anonimizados a un endpoint de logging, sin incluir datos personales (solo traza de pila, versión del juego, sistema operativo). Esto no es obligatorio para la primera versión.

**RNF15. Experiencia de usuario para adultos mayores**
multiples
- Los botones interactivos tendrán un **área de clic mínima de 44×44 píxeles**.
    
- Los temporizadores (si los hay) serán opcionales o con posibilidad de desactivarlos.
    
- Los textos de ayuda y tutoriales usarán **lenguaje ciudadano** (claro, frases cortas, ejemplos visuales).
    
- Se incluirá la opción de **aumentar el tamaño de la fuente** en la configuración del perfil.
**RFN16. Filtros para daltonismo** 
- La configuración debe añadir múltiples filtros para daltonismo. 


### Autenticación Offline y Privacidad por Diseño (Blind Indexing)

- **Descripción:** Se mantiene el excelente diseño de usar SQLite para operaciones offline y el hashing de la contraseña (Argon2id/bcrypt). Sin embargo, se elimina la práctica insegura de guardar el nombre real o el correo/teléfono en texto plano en la base de datos local. La nueva estrategia (Blind Indexing) indica que solo se guardará un `user_id` (UUID) y un `alias` visual (ej. "Jugador 1"). Para buscar la cuenta sin internet, el sistema calculará un hash del correo o teléfono introducido y lo comparará con un `email_hash` o `telefono_hash` guardado. Así, los datos reales nunca tocan el disco duro del usuario.
    
- **Apartado:** Base de datos local (SQLite), Seguridad, Frontend (App de Escritorio).
    

### Validación Anti-trampa en Local (Sello Criptográfico)

- **Descripción:** Se mantiene la tabla `sync_queue` local para encolar el progreso (XP ganada, niveles pasados) cuando no hay internet. La nueva estrategia añade una capa de seguridad: el frontend en Tauri deberá generar un sello criptográfico (HMAC) utilizando una llave secreta ofuscada cada vez que se inserte un registro en el SQLite local. Cuando regrese la conexión, el servidor en Go verificará este sello. Si un usuario abrió la base de datos con un editor y se sumó 10,000 de experiencia, el sello será inválido y el servidor rechazará la sincronización.
    
- **Apartado:** Base de datos local (SQLite), Backend (Go), Seguridad.
    

### Estrategia de Resolución de Conflictos (Merge Multidispositivo)

- **Descripción:** Se mantiene el concepto de sincronización en segundo plano con "retroceso exponencial" (exponential backoff) para cuidar la RAM. Se añade la estrategia matemática estricta para resolver colisiones cuando un mismo usuario juega en dos dispositivos desconectados distintos y luego ambos se conectan al servidor. La estrategia a usar es: **"Unión Aditiva" (Additive Merge)** para la experiencia (se suman los puntos de ambos dispositivos sin sobreescribirse) y la regla de **"Timestamp más reciente" (Last-Write-Wins)** para calcular el último día de actividad y actualizar la racha diaria.
    
- **Apartado:** Backend (Go), Base de Datos Oficial (PostgreSQL).
    

### Estrategia de Respaldos (DRP) en Hardware Restringido

- **Descripción:** Se mantiene la infraestructura 100% _On-Premise_ sobre PostgreSQL 15. Dado nuestro estricto límite de 20 GB de almacenamiento total, se añade una política de retención inamovible. La estrategia será ejecutar rutinas de `pg_dump` utilizando el algoritmo de compresión máxima `zstd` (que consume baja RAM) y conservar los respaldos conforme a la política institucional definida en el Documento de Seguridad y en el Convenio de Encargo: respaldos diarios por 7 días, semanales por 4 semanas y mensuales por 3 meses. En caso de saturación del servidor local, los respaldos excedentes deberán remitirse cifrados a la DGTI-UV o eliminarse conforme al procedimiento de supresión segura documentado, para evitar la caída del servidor por falta de espacio.
    
- **Apartado:** Backend, Base de Datos Oficial (PostgreSQL), Infraestructura.
    

### Auditoría Continua de Accesibilidad (Linters Automatizados)

- **Descripción:** Se mantienen las directrices de diseño para cumplir con el estándar WCAG 2.1 AA (tamaños de botón, alternativas visuales al color rojo para daltónicos). Se añade una capa de prevención tecnológica: en lugar de auditar el sistema al final, se implementarán herramientas de análisis estático continuo (como `eslint-plugin-jsx-a11y` o `react-axe`) directamente en el entorno de desarrollo de React. La estrategia es que, si un programador olvida poner una etiqueta para lectores de pantalla en un botón nuevo, el sistema no le permita compilar el código.
    
- **Apartado:** Frontend (React Web / App de Escritorio).