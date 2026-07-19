---
tipo: documento-legal
categorías:
  - proyecto
  - privacidad
  - cumplimiento
estado: 📋 en revisión
fecha: 2026-07-09
tags:
  - usbi
  - proteccion-de-datos
  - eipdp
  - ley-251
---
**Conceptos y Tecnologías Base:** [[Condiciones y acuerdos de la USBI]], [[Requisitos - USBI]], [[Plan integración]]
**Inspiración/Origen:** [[Proyecto de la USBI]]

---

# EVALUACIÓN DE IMPACTO EN LA PROTECCIÓN DE DATOS PERSONALES (EIPDP)

**Sujeto Obligado:** Universidad Veracruzana – Unidad de Servicios Bibliotecarios y de Información (USBI) región Coatzacoalcos-Minatitlán.

**Nombre del Proyecto:** Plataforma Educativa y Motor de Minijuegos – USBI.

**Versión del documento:** 2.2

**Fecha de elaboración:** 09 de julio de 2026

**Fundamento legal de la evaluación:** Artículo 74 de la Ley Número 251 de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Veracruz de Ignacio de la Llave (en lo sucesivo, "Ley 251"), que establece la obligación de realizar la presente evaluación. El plazo de presentación de la evaluación con 30 días de anticipación al inicio de operaciones del sistema se fundamenta en el **Artículo 77** de la Ley 251 y, en el ámbito federal, como referencia correlativa, Artículo 71 de la LGPDPPSO.

> **⚠️ Nota de verificación obligatoria:** La Ley 251 fue publicada en la Gaceta Oficial del Estado el 30 de junio de 2025 y abrogó a la anterior Ley 316. El fundamento que antes se citaba como "Artículo 104" de la Ley 316 es ahora el **Artículo 74** (obligación de realizar la EIPDP) y el **Artículo 77** (plazo de 30 días) de la nueva Ley 251. Antes de la presentación formal ante la autoridad, el Responsable deberá confirmar la correspondencia de todos los artículos citados contra el texto oficial de la Ley 251 publicado en la Gaceta Oficial del Estado de Veracruz.

---

## I. Objetivo y Alcance

**Objetivo:** Identificar, analizar y mitigar los riesgos que el tratamiento de datos personales en la Plataforma Educativa y Motor de Minijuegos de la USBI puede representar para los derechos y libertades de sus titulares, en cumplimiento con los principios de la Ley 251 y la metodología de Evaluación de Impacto en la Protección de Datos Personales.

**Alcance:** La presente evaluación cubre el ciclo de vida completo de los datos personales tratados a través de la plataforma interactiva: desde su obtención en el registro hasta su eliminación definitiva, incluyendo el almacenamiento local en dispositivo, la sincronización con el servidor institucional, el ejercicio de derechos y la gestión de incidentes de seguridad.

**Ámbito de aplicación:** Plataforma de escritorio (cliente Tauri) y acceso web, desplegada en la infraestructura local (on-premise) de la USBI, campus Coatzacoalcos, Universidad Veracruzana.

---

## II. Marco Jurídico

El tratamiento de datos personales en la presente plataforma se fundamenta en:

| Ordenamiento | Aplicación |
|---|---|
| Constitución Política de los Estados Unidos Mexicanos, Arts. 6° y 16 | Derecho fundamental a la protección de datos personales |
| Ley 251 de Veracruz (publicada 30/jun/2025) | Marco rector del tratamiento por sujetos obligados del Estado |
| Ley Orgánica de la Universidad Veracruzana | Atribución institucional de prestar servicios educativos y culturales |
| Estatuto de los Alumnos 2008 de la UV, Arts. 170–178 | Marco disciplinario interno aplicable a conductas indebidas en sistemas universitarios |
| Lineamientos Generales de Protección de Datos Personales para el Sector Público (INAI/SNT) | Metodología y buenas prácticas aplicables |
| NOM-151-SCFI-2016 | Referencia sobre conservación de mensajes de datos con valor probatorio |

---

## III. Descripción del Sistema y Justificación

La Plataforma Educativa y Motor de Minijuegos es una aplicación institucional de la USBI concebida para apoyar el aprendizaje mediante actividades gamificadas. Permite a los usuarios jugar niveles oficiales publicados por la USBI y, de manera separada, crear, probar, exportar e importar niveles comunitarios mediante el módulo Maker en modalidad local. Los niveles comunitarios no se alojan, publican ni sincronizan en la infraestructura institucional; únicamente los niveles oficiales y el progreso correspondiente se sincronizan con el servidor de la USBI.

**Justificación del tratamiento:** El tratamiento de datos personales es necesario para el cumplimiento de la función educativa y de vinculación cultural que la Ley Orgánica de la Universidad Veracruzana encomienda a la USBI. Sin la identificación mínima del usuario no es posible garantizar la integridad del progreso académico, implementar el protocolo de consentimiento tutelar para menores ni asegurar la rendición de cuentas en el uso de los recursos informáticos institucionales.

**Arquitectura de privacidad:** La plataforma fue diseñada bajo el principio de _Privacidad por Diseño_, adoptando una arquitectura de procesamiento local (on-premise) que elimina la dependencia de servicios de cómputo en la nube de terceros, reduciendo la superficie de exposición de datos.

**Volumen proyectado de titulares (Intensidad del tratamiento):** El sistema está diseñado para soportar hasta **10,000 usuarios registrados históricos** en la región universitaria Coatzacoalcos-Minatitlán (la concurrencia operativa dependerá de las pruebas de carga técnica), conforme al Requisito No Funcional 12 (RNF12) del Plan de Integración. Este volumen, combinado con la operación en hardware restringido (1 vCPU, 1 GB RAM, 20 GB de almacenamiento), el procesamiento de datos de menores de edad y el uso de tecnología con autenticación digital, configura un tratamiento de carácter **intensivo o relevante** en términos de los Artículos 74 y 77 de la Ley 251, justificando la obligación de elaborar la presente evaluación.

---

## IV. Inventario y Clasificación de Datos Personales

**Declaración expresa:** Esta plataforma **NO trata datos personales sensibles** (datos de salud, origen étnico, creencias religiosas, orientación sexual, datos biométricos o información genética).

| Categoría | Dato Personal | Finalidad | ¿Obligatorio? | Plazo de conservación |
|---|---|---|---|---|
| Identificativo | Nombre completo | Identificación del usuario en el sistema | Sí | Mientras exista relación activa + 1 año |
| Electrónico | Correo electrónico | Autenticación y recuperación de cuenta | Sí | Mientras exista relación activa + 1 año |
| Electrónico | Número de teléfono | Canal de recuperación alternativo (opcional) | No | Mientras exista relación activa |
| Electrónico | Credencial de acceso / Contraseña | Autenticación del usuario. **Nota:** Se almacena únicamente el hash irreversible (Argon2id); el sistema nunca conserva la contraseña en texto plano. | Sí | Mientras exista la cuenta; se elimina junto con ella |
| Capacidad jurídica | Indicador booleano de mayoría de edad | Activar flujo de consentimiento tutelar para menores | Sí | Mientras exista la cuenta |
| Representación legal (menores) | Nombre y correo del tutor legal | Acreditar consentimiento parental exigido por la Ley 251 | Condicional | Hasta que el titular confirme mayoría de edad |
| Académico / Progreso | Niveles completados, puntuación, logros | Gamificación, continuidad del aprendizaje, estadísticas de uso | Sí | Mientras exista relación activa |
| Técnico | Datos de sesión (tokens de autenticación) | Control de acceso y seguridad de la sesión | Automático | Duración de la sesión activa |

**Principio de minimización aplicado:** Se adopta el principio de minimización de datos, evitando el tratamiento de información innecesaria para el fin declarado. En particular, no se almacena la fecha de nacimiento exacta del usuario; para determinar la capacidad jurídica del titular únicamente se conserva un indicador de mayoría de edad (booleano), lo que resulta suficiente para activar el protocolo de consentimiento tutelar requerido por la Ley 251.

> **Aclaración sobre los datos del tutor legal:** Cuando el indicador booleano devuelve `False` (usuario menor de edad), el sistema recaba obligatoriamente el **nombre completo y correo electrónico del padre, madre o tutor legal**, los cuales se almacenarán en la tabla `tutor_consents`, asociada al usuario menor mediante llave foránea, con cifrado a nivel de columna y registro auditable de aceptación. Estos datos no forman parte del perfil del usuario menor, sino del registro de consentimiento parental, y se eliminan automáticamente al confirmarse la mayoría de edad del titular conforme a los principios de minimización y conservación. Esta recopilación es una obligación legal, no una decisión de diseño opcional.

---

## V. Finalidades del Tratamiento

### Finalidades primarias (vinculadas directamente al servicio)

1. Gestionar el registro, autenticación y control de acceso al sistema de minijuegos educativos.
2. Sincronizar, respaldar y auditar de forma segura el progreso, experiencia y niveles superados del usuario entre dispositivos.
3. Validar y registrar el consentimiento legal del tutor en el caso de usuarios menores de edad.
4. Generar estadísticas de uso agregadas y anonimizadas para la mejora del servicio educativo de la USBI.

### Finalidades administrativas, instrumentales y de cumplimiento normativo

5. Facilitar la rendición de cuentas institucional y la auditoría interna del uso de los recursos informáticos de la UV.
6. Habilitar el ejercicio de derechos ARCO por parte del titular o su representante legal.

**Se informa expresamente que no se realizarán tratamientos adicionales a los aquí declarados ni se utilizarán los datos para fines comerciales, publicitarios o de elaboración de perfiles con efectos jurídicos sobre el titular.**

---

## V-bis. Declaratoria de Transferencias y Remisiones de Datos

En cumplimiento del Criterio Sexto de los Lineamientos del Sistema Nacional de Transparencia para la valoración de Evaluaciones de Impacto en la Protección de Datos Personales, y en congruencia con la arquitectura de soberanía de datos diseñada para esta plataforma, se declara expresamente lo siguiente:

**La plataforma NO realiza transferencias nacionales ni internacionales de datos personales a terceros.** En estricto apego a la arquitectura 100% On-Premise, queda absolutamente prohibida la transmisión, almacenamiento o procesamiento de la base de datos PostgreSQL en servicios de cómputo en la nube de terceros (incluyendo, de manera enunciativa pero no limitativa: AWS, Azure, Google Cloud, o cualquier proveedor de infraestructura externo).

Las únicas situaciones en que podría producirse una remisión o comunicación de datos son:

1. **Respaldos cifrados internos:** El traslado de respaldos cifrados al servidor de la Dirección General de Tecnologías de la Información de la UV (DGTI-UV) mediante canal seguro (Rsync sobre SSH) se rige por el convenio de encargo de tratamiento suscrito entre la USBI y la DGTI-UV. En ningún momento los datos viajan fuera de la infraestructura de la Universidad Veracruzana.
2. **Requerimientos de autoridad:** Cuando una autoridad judicial o administrativa competente emita un requerimiento debidamente fundado y motivado, la USBI atenderá la solicitud conforme a lo establecido en la Ley 251 y la normatividad aplicable, limitando la comunicación a los datos estrictamente necesarios para cumplir el requerimiento.

---

## VI. Base Jurídica del Tratamiento

Para cada categoría de datos, el tratamiento se sustenta en alguna de las siguientes bases jurídicas previstas en la Ley 251:

| Dato | Base jurídica |
|---|---|
| Datos identificativos y de contacto | Consentimiento expreso del titular otorgado mediante el Aviso de Privacidad integrado en el registro; prestación del servicio educativo público conforme a las atribuciones de la Ley Orgánica de la UV |
| Indicador de mayoría de edad y datos del tutor | Obligación legal derivada de la Ley 251 (consentimiento de representantes para menores) |
| Datos de progreso académico | Prestación del servicio solicitado y ejercicio de atribuciones educativas de la UV |
| Datos de sesión técnicos | Seguridad del sistema y protección del propio titular |

---

## VII. Actores del Tratamiento

| Rol | Quién | Responsabilidad |
|---|---|---|
| **Responsable del tratamiento** | Universidad Veracruzana – USBI región Coatzacoalcos-Minatitlán | Determina las finalidades y medios del tratamiento; garantiza el cumplimiento de la Ley 251 |
| **Director de la USBI** | _(Nombre y cargo a completar)_ | Firma y valida el presente documento; es el punto de contacto institucional ante la autoridad |
| **Desarrollador / Encargado técnico** | _(Nombre o área a completar)_ | Implementa y mantiene los controles de seguridad técnica; encargado técnico del desarrollo, sin acceso ordinario a la base de datos de producción |
| **Personal administrativo USBI** | Personal de atención al usuario | Apoya al titular en el ejercicio de derechos ARCO; canaliza solicitudes a la CUTAI |
| **Personal de TI de la UV** | Área de Tecnologías de la Información de la UV | Administra el servidor institucional on-premise; sujeto a obligación de confidencialidad y controles de acceso privilegiado |
| **CUTAI** | Coordinación Universitaria de Transparencia, Acceso a la Información y Protección de Datos Personales | Recibe y tramita solicitudes ARCO; supervisa el cumplimiento normativo |

---

## VIII. Flujo de Datos

```
[Usuario / Tutor]
      |
      | (Registro + Aceptación del Aviso de Privacidad)
      ↓
[Cliente: App de escritorio o Navegador Web]
      |
      | (Datos de sesión y progreso temporal, cifrados en dispositivo)
      ↓
[Base de datos local cifrada en el dispositivo del usuario]
      |
      | (Sincronización autenticada → HTTPS + firma de integridad)
      ↓
[Servidor institucional on-premise – USBI Coatzacoalcos]
      |
      ├──→ [Base de datos central – PostgreSQL] (datos de usuario y progreso)
      |
      └──→ [Respaldos cifrados periódicos]
                  |
                  └──→ [Almacenamiento secundario en la red universitaria UV]
                         (bajo convenio de encargo de tratamiento con la unidad receptora)
```

**Declaración sobre remisiones y transferencias:** No se realizan transferencias de datos personales a terceros externos, organismos privados ni a servicios en la nube pública. La única remisión interna contemplada es el traslado de respaldos cifrados hacia otra dependencia de la red universitaria de la UV, operación que deberá formalizarse mediante un **convenio de encargo de tratamiento** entre responsable y persona encargada antes de ser ejecutada. Cualquier requerimiento de información de autoridad judicial o administrativa competente, debidamente fundado y motivado, será atendido conforme a la normativa aplicable.

---

## IX. Ciclo de Vida de los Datos

1. **Obtención:** A través de la interfaz de registro de la plataforma, previa presentación del Aviso de Privacidad e instrucción expresa de aceptación por parte del titular (o su tutor, en caso de menores).
2. **Almacenamiento local temporal:** Los datos de sesión y el progreso del usuario se guardan de forma temporal y cifrada en el dispositivo durante el uso sin conexión.
3. **Sincronización on-premise:** Cuando se dispone de conexión, los registros se transmiten de forma autenticada al servidor institucional y se centralizan en la base de datos oficial, que reside exclusivamente en la infraestructura de la UV.
4. **Conservación activa:** Los datos se conservan durante el tiempo en que el usuario mantenga una cuenta activa, más un período adicional de un (1) año para fines de auditoría interna.
5. **Bloqueo:** Transcurrido el período de conservación sin actividad, los datos se bloquean de forma preventiva (se impide cualquier tratamiento distinto al requerido por obligación legal).
6. **Supresión definitiva:** Los datos son eliminados de forma permanente e irrecuperable de todos los sistemas (servidor central y dispositivo del usuario) a través del mecanismo descrito en la Sección XII.

**Período máximo de conservación de datos de tutores (menores):** Los datos del tutor legal se eliminan automáticamente en el momento en que el sistema registra la confirmación de mayoría de edad por parte del titular, conforme al deber de cancelación y actualización de la Ley 251.

---

## X. Análisis de Necesidad y Proporcionalidad

Para cada dato tratado se evalúa si existe una alternativa menos invasiva que permita alcanzar el mismo fin:

| Dato | ¿Es necesario? | Alternativa menos invasiva evaluada | Conclusión |
|---|---|---|---|
| Nombre completo | Sí | Un apodo o usuario anónimo no permite la rendición de cuentas institucional ni la validación de consentimiento tutelar | **Necesario y proporcional** |
| Correo electrónico | Sí | No existe mecanismo alternativo de autenticación que garantice la continuidad de la cuenta y la notificación de derechos ARCO | **Necesario y proporcional** |
| Teléfono | No (opcional) | El correo cubre la finalidad de recuperación; el teléfono se ofrece como opción adicional sin ser obligatorio | **Proporcional; su recopilación es voluntaria** |
| Fecha de nacimiento exacta | No | El indicador booleano de mayoría de edad satisface plenamente la necesidad jurídica sin requerir el dato exacto | **Suprimido por minimización** |
| Datos de progreso | Sí | Sin estos datos, la funcionalidad central de la plataforma (gamificación y seguimiento académico) no puede operar | **Necesario y proporcional** |
| Datos del tutor (menores) | Condicional | Únicamente se recaban cuando el usuario declara ser menor de edad | **Proporcional; activación condicional** |

**Conclusión de proporcionalidad:** El conjunto de datos tratados se considera el mínimo indispensable para cumplir con las finalidades declaradas y las obligaciones legales aplicables, respetando el principio de minimización de la Ley 251.

---

## XI. Medidas de Seguridad

### A. Medidas Técnicas

| Medida | Descripción |
|---|---|
| Cifrado en reposo (dispositivo) | Los datos almacenados localmente se protegen mediante cifrado, de modo que resulten ilegibles sin la clave de sesión del usuario |
| Destrucción criptográfica de sesión | Al finalizar la sesión del usuario (cierre de sesión activo, cierre de la aplicación o detección de inactividad prolongada según umbral configurable), la clave de cifrado de la base local se elimina de la memoria RAM, aislando la sesión de usuarios consecutivos en equipos compartidos |
| Autenticación con firma de integridad | Las operaciones de sincronización al servidor se autentican mediante firma criptográfica (HMAC), garantizando que cualquier alteración de los datos en tránsito o en el dispositivo sea detectada y el servidor rechace la sincronización |
| Tokens de autenticación con expiración | Las sesiones autenticadas tienen una vigencia limitada; el sistema valida periódicamente la vigencia de la sesión para prevenir el acceso no autorizado |
| Transmisión cifrada | Toda comunicación entre el cliente y el servidor se realiza sobre canal cifrado (HTTPS/TLS) |
| Respaldos cifrados y comprimidos | Se ejecutan respaldos periódicos de la base de datos central conforme al Plan Institucional de Continuidad de Operaciones, conservando localmente los últimos tres respaldos diarios y uno semanal |
| Prueba de restauración | Los respaldos son verificados mediante pruebas de restauración periódicas documentadas para garantizar su integridad y usabilidad efectiva |
| Control de acceso privilegiado | El personal de TI con acceso al servidor opera bajo el principio de mínimo privilegio; los accesos administrativos quedan registrados en bitácoras de auditoría |

### B. Medidas Administrativas

| Medida | Descripción |
|---|---|
| Aviso de Privacidad (Simplificado e Integral) | Disponibles e integrados en la interfaz de la plataforma, con casilla de aceptación desmarcada por defecto |
| Canal formal de derechos ARCO | Solicitudes canalizadas a la CUTAI de la UV |
| Capacitación del personal | El personal de la USBI involucrado en el tratamiento recibe instrucciones sobre el manejo confidencial de datos personales y el protocolo de incidentes |
| Convenio de encargo de tratamiento | Requerido antes de cualquier traslado de respaldos a otra unidad de la red universitaria |
| Revisión periódica del presente documento | La EIPDP se revisará al menos anualmente o ante cualquier cambio material en el sistema o en la normativa aplicable |

### C. Medidas Físicas

| Medida | Descripción |
|---|---|
| Control de acceso al área de servidores | El servidor on-premise se ubica en un área de acceso restringido. El acceso físico queda registrado en bitácora con nombre, fecha y motivo de la visita |
| Protección ambiental | El área de servidores cuenta con protección contra incendio, control de temperatura y suministro eléctrico regulado (UPS) |
| Política de pantallas limpias | Los equipos de la USBI accesibles al público cuentan con configuraciones de bloqueo automático de pantalla por inactividad |
| Custodia de medios físicos | Los medios de respaldo físicos (si aplica) se almacenan en área segura con acceso controlado |

---

## XII. Matriz de Riesgos y Controles

### Escala de clasificación

| Nivel | Probabilidad | Impacto |
|---|---|---|
| **Alto** | El escenario ocurre frecuentemente o existe evidencia de que ha ocurrido en contextos similares | Consecuencias graves para los derechos del titular: daño reputacional, discriminación, pérdida económica, acceso no autorizado a servicios |
| **Medio** | El escenario es posible y existen condiciones que lo favorecen | Consecuencias moderadas: inconvenientes significativos, necesidad de gestión adicional, afectación parcial de derechos |
| **Bajo** | El escenario es poco probable dado el contexto y los controles existentes | Consecuencias menores: molestias leves o impacto fácilmente reversible |

### Tabla de riesgos

| # | Escenario de Riesgo | Prob. | Impacto | Medidas de Mitigación Implementadas | Riesgo Residual |
|---|---|---|---|---|---|
| 1 | **Acceso no autorizado en equipos compartidos.** Un usuario deja su sesión abierta en una terminal pública de la USBI. | Alta | Alto | Cierre de sesión automático por inactividad con tiempo límite configurable; destrucción criptográfica de la clave de sesión local al cerrar la aplicación o al detectar inactividad | **Bajo** |
| 2 | **Alteración maliciosa de datos de progreso.** Un usuario modifica la base de datos local para inflar su puntuación. | Media | Medio | Validación de integridad mediante firma criptográfica al sincronizar; rechazo automático de sincronizaciones con firma inválida; la conducta se canaliza conforme a la normatividad disciplinaria universitaria | **Bajo** |
| 3 | **Vulneración de soberanía de datos / filtración externa.** Los datos son exfiltrados hacia servicios externos no autorizados. | Baja | Alto | Arquitectura 100% on-premise; prohibición de servicios de nube pública; toda comunicación pasa por el servidor institucional bajo control exclusivo de la UV | **Bajo** |
| 4 | **Pérdida de disponibilidad por fallo o saturación del servidor.** | Media | Alto | Respaldos cifrados periódicos con política de retención definida; pruebas de restauración documentadas; almacenamiento secundario en la red universitaria (bajo convenio) | **Medio** |
| 5 | **Robo o phishing de credenciales / Token comprometido.** Un atacante obtiene las credenciales de un usuario mediante engaño o intercepta un token de sesión válido. | Alta | Alto | **Riesgo residual aceptado por decisión de arquitectura:** El sistema utiliza JWT stateless para eliminar la necesidad de Redis (~50 MB de RAM), lo cual es incompatible con la restricción de hardware de 1 GB del servidor. Como consecuencia técnica documentada en el Plan de Integración, **un token comprometido no puede revocarse desde el servidor antes de su expiración**. La mitigación se limita a: access token de duración corta (15 min), refresh token de 7 días, y opcionalmente un campo `token_version` en la base de datos para invalidar sesiones de cuentas suspendidas sin Redis. Esta limitación es una compensación (tradeoff) consciente y documentada entre seguridad y restricciones de hardware. La aceptación formal de este riesgo residual corresponde al Director de la USBI. | **Medio – Riesgo residual aceptado** |
| 6 | **Infección por malware en equipos públicos.** Un equipo de la USBI accesible al público está comprometido y extrae datos de sesión. | Media | Alto | Política de gestión de equipos institucionales (antivirus, actualizaciones); destrucción criptográfica de sesión al cerrar; restricción de ejecución de software no autorizado en equipos de la USBI | **Medio** |
| 7 | **Error humano del administrador.** Un miembro del personal de TI elimina, modifica o expone datos por accidente. | Media | Alto | Principio de mínimo privilegio; bitácoras de acceso y auditoría de acciones administrativas; respaldos verificados permiten restauración | **Medio** |
| 8 | **Configuración incorrecta del servidor.** Una mala configuración expone la base de datos institucional a accesos no autorizados. | Baja | Alto | Revisión periódica de la configuración de seguridad del servidor; acceso a la base de datos restringido a la aplicación y al personal de TI autorizado; sin exposición de puertos innecesarios | **Bajo** |
| 9 | **Ataque de red (interceptación de tráfico / MITM).** Un atacante intercepta la comunicación entre el cliente y el servidor. | Baja | Alto | Toda comunicación se realiza sobre canal cifrado (TLS); validación de certificado del servidor | **Bajo** |
| 10 | **Ransomware o cifrado malicioso del servidor.** El servidor es comprometido y los datos quedan cifrados e inaccesibles. | Baja | Alto | Respaldos cifrados fuera del servidor principal (almacenamiento secundario en red UV); plan de recuperación ante desastres documentado | **Medio** |
| 11 | **Vulneración de respaldos.** Los archivos de respaldo son accedidos o modificados por un actor no autorizado. | Baja | Alto | Los respaldos se almacenan cifrados; el acceso al almacenamiento secundario requiere autenticación; el convenio de encargo de tratamiento establece las medidas de seguridad exigidas a la unidad receptora | **Bajo** |
| 12 | **Pérdida de energía y corrupción de datos.** Una interrupción eléctrica corrompe la base de datos del servidor. | Media | Medio | Suministro eléctrico regulado (UPS) en el área de servidores; política de respaldos permite restauración ante fallo | **Bajo** |
| 13 | **Acceso privilegiado indebido.** Un administrador de TI consulta o extrae datos personales sin autorización. | Baja | Alto | Principio de mínimo privilegio; bitácoras de auditoría de accesos administrativos; segregación de funciones entre personal de desarrollo y administración del servidor | **Bajo** |
| 14 | **Publicación de contenido indebido en módulo Maker.** Un usuario publica niveles con datos personales de terceros o contenido ilícito. | Media | Medio | Aviso de Privacidad con cláusula de responsabilidad del usuario sobre el contenido; la plataforma únicamente realiza validación de esquema y sanitización técnica en el cliente para prevenir inyección de código al cargar un JSON, pero la USBI no aloja ni modera el contenido de los niveles compartidos fuera de su infraestructura. | **Bajo** |

---

## XIII. Derechos ARCO y Consentimiento

### Ejercicio de Derechos ARCO

Los titulares (o sus tutores legales, en el caso de menores) tienen derecho a ejercer en cualquier momento:

- **Acceso:** Conocer qué datos personales se tienen y cómo se tratan.
- **Rectificación:** Corregir datos inexactos o incompletos.
- **Cancelación:** Solicitar la eliminación permanente de sus datos cuando no sean necesarios para la finalidad declarada o cuando se retire el consentimiento.
- **Oposición:** Oponerse al tratamiento para fines específicos.

El ejercicio de estos derechos es gratuito y se tramita mediante solicitud formal ante la **Coordinación Universitaria de Transparencia, Acceso a la Información y Protección de Datos Personales (CUTAI):**

- **Domicilio:** Calle Guillermo Prieto número 103, colonia Dos de Abril, CP 91030, Xalapa, Veracruz.
- **Teléfonos:** (228) 8 42 1700 ext. 10504 | (228) 8 41 59 20
- **Correo:** datospersonales@uv.mx
- **Plataforma Nacional de Transparencia:** _(URL oficial de la PNT)_

### Mecanismo de Consentimiento para Menores de Edad

En cumplimiento de la Ley 251, si el usuario declara ser menor de 18 años durante el registro, el sistema activa el siguiente flujo:

1. Se despliega un formulario obligatorio solicitando el nombre completo y correo electrónico del padre, madre o tutor legal.
2. El Aviso de Privacidad Integral se presenta con casilla de aceptación desmarcada por defecto. La creación de la cuenta queda bloqueada hasta que el tutor marque activamente la casilla.
3. El registro de consentimiento del tutor queda firmado criptográficamente y sincronizado con el servidor, lo que permite a la UV demostrar de forma auditable el consentimiento otorgado.
4. **Transición a mayoría de edad:** El sistema solicitará al usuario la confirmación de su estatus de mayoría de edad durante el ciclo de verificación anual (dentro de los 30 días previos a la fecha de aniversario de su registro). Si el usuario confirma haber alcanzado la mayoría de edad, los datos del tutor son eliminados de forma permanente de todos los sistemas en un plazo máximo de 72 horas. Si el usuario no responde tras dos notificaciones enviadas al correo registrado en un período de 30 días calendario, la cuenta es **suspendida temporalmente** (acceso bloqueado, datos conservados) hasta que el usuario o su tutor actualice la información o ejerza el derecho de Cancelación.

---

## XIV. Conservación y Eliminación de Datos

### Plazos de conservación

| Tipo de dato | Criterio de conservación | Plazo máximo tras inactividad |
|---|---|---|
| Datos de cuenta (nombre, correo, indicador de edad) | Mientras exista una cuenta activa | Baja o 1 año desde la última sesión, luego supresión |
| Datos de progreso y niveles | Mientras exista una cuenta activa | Baja o 1 año desde la última sesión, luego supresión |
| Datos del tutor legal | Hasta la confirmación de mayoría de edad | Eliminación en 72 horas tras confirmación |
| Tokens de sesión | Duración de la sesión activa | Eliminación al cierre de sesión |
| Respaldos | Conforme a Convenio Institucional (Diarios/Semanales/Mensuales) | 7 días (diarios), 4 semanas (semanales), 3 meses (mensuales) |

### Mecanismo de eliminación

Cuando el titular ejerce el derecho de Cancelación o se alcanza el plazo máximo de conservación, la eliminación se realiza mediante:

1. **Eliminación lógica inmediata:** Se desactiva el acceso a la cuenta.
2. **Purga de la base de datos central:** La CUTAI notifica al sistema para que los registros del titular sean eliminados de forma permanente e irreversible de la base de datos del servidor.
3. **Eliminación local:** Se emite la instrucción de borrado criptográfico de los datos locales en el dispositivo del usuario (`wipe_local_data`), que se ejecuta en la siguiente sesión activa de la aplicación o, si el dispositivo ya no se conecta, queda registrado para ejecución al primer inicio.

---

## XV. Gestión de Incidentes de Seguridad

En caso de detectarse una vulneración de seguridad que afecte datos personales, se activará el siguiente protocolo:

```
[Detección del incidente]
       ↓
[Contención inmediata]
(Aislar el sistema afectado; revocar accesos comprometidos)
       ↓
[Evaluación del alcance]
(¿Qué datos? ¿Cuántos titulares? ¿Qué tipo de vulneración?)
       ↓
[Notificación interna]
(Director de la USBI + Personal de TI + CUTAI — en un máximo de 24 horas)
       ↓
[Notificación a los titulares afectados]
(Por correo electrónico registrado — en un máximo de 72 horas desde la confirmación)
       ↓
[Notificación a la autoridad garante]
(CUTAI → autoridad competente del Estado de Veracruz — en un máximo de 72 horas)
       ↓
[Análisis de causa raíz y medidas correctivas]
       ↓
[Actualización de la EIPDP y del Documento de Seguridad]
```

**Contenido mínimo de la notificación a los titulares:** Descripción del incidente, categorías y cantidad aproximada de datos afectados, posibles consecuencias para el titular, medidas adoptadas, datos de contacto de la CUTAI para ejercer derechos ARCO.

---

## XVI. Cumplimiento de Principios

| Principio (Ley 251) | Cumplimiento en la plataforma |
|---|---|
| **Licitud** | El tratamiento se sustenta en las atribuciones educativas de la UV y en el consentimiento expreso del titular |
| **Finalidad** | Las finalidades son específicas, determinadas y comunicadas en el Aviso de Privacidad; no se utilizan los datos para fines distintos |
| **Minimización / Proporcionalidad** | Solo se recaban los datos estrictamente necesarios; la fecha de nacimiento es sustituida por un indicador booleano |
| **Calidad** | El sistema permite la rectificación de datos; los datos obsoletos son cancelados |
| **Consentimiento** | Se obtiene mediante casilla no pre-marcada; el consentimiento tutelar para menores es obligatorio y auditable |
| **Responsabilidad** | La UV / USBI es la responsable del tratamiento; el desarrollador actúa como encargado técnico del desarrollo, sin acceso ordinario a datos personales de producción; cualquier acceso excepcional deberá ser autorizado, documentado y supervisado por el Responsable. |
| **Seguridad** | Se implementan medidas técnicas, administrativas y físicas proporcionales al riesgo |
| **Confidencialidad** | El personal involucrado está sujeto a deber de confidencialidad |

---

## XVII. Conclusiones y Plan de Mejora

**Conclusión general:** El sistema presenta un diseño de privacidad sólido y bien fundamentado. Las principales fortalezas son la arquitectura on-premise, el mecanismo de firma criptográfica para integridad de datos y el flujo de consentimiento tutelar para menores. Con la incorporación de los elementos añadidos en esta versión del documento (inventario de datos, base jurídica, análisis de necesidad y proporcionalidad, medidas físicas, gestión de incidentes, plazos de conservación y eliminación), la evaluación alcanza el nivel de completitud requerido para una EIPDP formal.

**Plan de mejora y seguimiento:**

| Acción | Responsable | Plazo |
|---|---|---|
| ~~Verificar los números de artículo de la Ley 251 contra la Gaceta Oficial~~ | ~~Director de la USBI / CUTAI~~ | ✅ Corregido en v2.1: Art. 74 (obligación) y Art. 77 (plazo) |
| Formalizar el convenio de encargo de tratamiento para respaldos con la **Dirección General de Tecnologías de la Información de la UV (DGTI-UV)**, identificada como unidad receptora de los respaldos cifrados | Director de la USBI + DGTI-UV | Antes de la primera transferencia de respaldos |
| Establecer y documentar el umbral de inactividad para cierre de sesión automático | Desarrollador técnico | Antes del despliegue en producción |
| Implementar y documentar la bitácora de accesos administrativos al servidor | Personal de TI | Antes del despliegue en producción |
| Verificar las condiciones físicas del área de servidores (UPS, control de acceso) | Director de la USBI + TI | Antes del despliegue en producción |
| Validación formal del riesgo residual JWT (Riesgo 5) por parte del Responsable | Director de la USBI | Antes del despliegue en producción |
| Revisión anual de la presente EIPDP | Director de la USBI | Cada 12 meses o ante cambio material en el sistema |

---

## XVIII. Opinión Técnica del Oficial de Protección de Datos

_(Sección obligatoria conforme a los Lineamientos del Sistema Nacional de Transparencia para la presentación de EIAs ante la autoridad garante)_

**Coordinación Universitaria de Transparencia, Acceso a la Información y Protección de Datos Personales (CUTAI)**

Habiendo revisado la presente Evaluación de Impacto en la Protección de Datos Personales correspondiente a la "Plataforma Educativa y Motor de Minijuegos – USBI", en ejercicio de mis atribuciones como Oficial de Protección de Datos Personales de la Universidad Veracruzana:

**Opinión técnica:** ☐ Favorable sin observaciones &nbsp;&nbsp; ☐ Favorable con observaciones &nbsp;&nbsp; ☐ No favorable

**Observaciones:** _(Completar por el titular de la CUTAI)_

___________________________________________________________________________

___________________________________________________________________________

**Nombre del titular de la CUTAI:** ___________________________________

**Cargo:** ___________________________________

**Fecha:** _________________________

**Firma:** ___________________________________

---

## XIX. Firma del Responsable del Tratamiento

**Nombre:** ___________________________________

**Cargo:** Director/a de la USBI – Región Coatzacoalcos-Minatitlán, Universidad Veracruzana

**Fecha:** _________________________

**Firma:** ___________________________________

---

## 🌪️ Notas Desordenadas (Brainstorming)
- ~~Confirmar número exacto de artículos de la Ley 251 con la Gaceta Oficial~~ → ✅ Corregido: Art. 74 y Art. 77
- ~~Preguntar al área de TI de la UV sobre la unidad de red para los respaldos~~ → ✅ Identificada: DGTI-UV (Dirección General de Tecnologías de la Información)
- Revisar si el Estatuto de Alumnos 2008 sigue vigente o fue actualizado
- Definir el umbral exacto de inactividad para el cierre de sesión automático
- Definir las condiciones físicas reales del cuarto de servidores de la USBI
- Obtener la firma del titular de la CUTAI (Sección XVIII) antes de la presentación formal
- Que el Director de la USBI firme formalmente la aceptación del riesgo residual JWT (Riesgo 5)

---

## 🔗 Ecosistema y Referencias Externas

**Normativa:**
- [Ley 251 – Gaceta Oficial Veracruz (30/jun/2025)](https://www.veracruz.gob.mx/gaceta)
- [LGPDPPSO – INAI](https://www.gob.mx/inai)
- [Lineamientos Generales de Protección de Datos – SNT](https://www.inai.org.mx)

**Relacionados en la bóveda:**
- [[Condiciones y acuerdos de la USBI]]
- [[Requisitos - USBI]]
- [[Plan integración]]
