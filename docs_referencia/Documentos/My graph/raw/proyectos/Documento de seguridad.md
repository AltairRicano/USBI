---
tipo: documento-legal
categorías:
  - proyecto
  - seguridad
  - privacidad
estado: 📋 en revisión
fecha: 2026-07-09
tags:
  - usbi
  - documento-seguridad
  - ley-251
---
**Complementa a:** [[Evaluación de impacto en la protección de datos personales (EIPDP)]], [[Condiciones y acuerdos de la USBI]], [[Requisitos - USBI]], [[Plan integración]]

---

# DOCUMENTO DE SEGURIDAD
## PLATAFORMA EDUCATIVA Y MOTOR DE MINIJUEGOS USBI

---

## Control Documental

| Campo | Valor |
|---|---|
| **Nombre del documento** | Documento de Seguridad — Plataforma Educativa y Motor de Minijuegos USBI |
| **Sujeto Obligado** | Universidad Veracruzana – USBI región Coatzacoalcos-Minatitlán |
| **Versión** | 2.0 |
| **Fecha de elaboración** | 09 de julio de 2026 |
| **Fecha de próxima revisión** | 09 de julio de 2027 (o antes si cambia la infraestructura, el tratamiento o la legislación aplicable) |
| **Elaboró** | _(Nombre y cargo a completar)_ |
| **Revisó** | Coordinación Universitaria de Transparencia, Acceso a la Información y Protección de Datos Personales (CUTAI) |
| **Autorizó** | Director/a de la USBI – Región Coatzacoalcos-Minatitlán |
| **Fundamento Legal** | Arts. 25 a 30 de la LGPDPPSO, relativos a medidas de seguridad, sistema de gestión y documento de seguridad; así como las disposiciones correlativas aplicables de la Ley Número 251 del Estado de Veracruz |
| **Folio de Control Interno** | **PENDIENTE DE ASIGNACIÓN.** Se actualizará tras el registro en el inventario interno de sistemas de datos personales bajo control de la CUTAI, para fines de organización institucional. |

### Historial de Cambios

| Versión | Fecha | Descripción del cambio | Responsable |
|---|---|---|---|
| 1.0 | 2026-07-09 | Elaboración inicial del documento | _(A completar)_ |
| 2.0 | 2026-07-09 | Incorporación de: Glosario, Inventario de Activos, Política de Conservación Documental, KPIs administrativos, nuevos riesgos legales y operativos; corrección de plazos normativos y procedimiento de borrado seguro. | _(A completar)_ |

### Distribución Autorizada

Este documento es de carácter **Restringido**. Su distribución está limitada a:

- Director/a de la USBI
- Administrador de Infraestructura (Personal de TI de la UV)
- Desarrollador / Encargado Técnico
- CUTAI (para efectos de supervisión normativa)

---

## 0. Glosario y Definiciones

| Término | Definición |
|---|---|
| **Responsable del Tratamiento** | La entidad que determina las finalidades y los medios del tratamiento de datos personales. En este caso: la Universidad Veracruzana a través de la USBI. |
| **Persona Encargada** | La persona física o moral que, de forma autónoma o conjunta, trate datos personales por cuenta del Responsable. En este caso: la DGTI-UV (para efectos de custodia de respaldos), bajo instrumento jurídico formal de remisión. |
| **Titular** | La persona física cuyos datos personales son objeto de tratamiento. En este caso: estudiantes, personal académico y tutores legales de menores que utilizan la plataforma. |
| **CUTAI** | Coordinación Universitaria de Transparencia, Acceso a la Información y Protección de Datos Personales. Órgano interno de la Universidad Veracruzana responsable de supervisar el cumplimiento de las obligaciones en materia de protección de datos y transparencia. |
| **DGTI-UV** | Dirección General de Tecnologías de la Información de la Universidad Veracruzana. Actúa como persona encargada para la custodia de los respaldos cifrados del sistema, bajo convenio de encargo. |
| **Incidente de Seguridad** | Cualquier evento que comprometa o pueda comprometer la confidencialidad, integridad o disponibilidad de los datos personales tratados por la plataforma. |
| **Brecha de Seguridad** | Vulneración que ocasione la destrucción, pérdida, alteración, comunicación o acceso no autorizado a datos personales. |
| **Activo** | Cualquier componente (hardware, software, datos, documentos, procesos o personas) que tenga valor para la operación del sistema y que deba ser protegido. |
| **RPO** (Recovery Point Objective) | Pérdida máxima de datos aceptable en caso de incidente, expresada en tiempo. |
| **RTO** (Recovery Time Objective) | Tiempo máximo aceptable de interrupción del servicio antes de que deba restablecerse la operación. |
| **ARCO** | Derechos de Acceso, Rectificación, Cancelación y Oposición reconocidos a los titulares conforme a la Ley Número 251. |
| **Tratamiento** | Cualquier operación realizada sobre datos personales: obtención, uso, divulgación, almacenamiento, acceso, manejo, aprovechamiento, transferencia o disposición. |

---

## 1. Inventario de Datos Personales y Sistemas de Tratamiento

La plataforma trata única y exclusivamente los datos personales necesarios para la prestación del servicio educativo y la validación del consentimiento tutelar, conforme al Principio de Proporcionalidad y Minimización de la Ley Número 251. Todos los datos residen en servidores bajo control exclusivo de la Universidad Veracruzana.

Para el universo completo de tratamientos, finalidades y bases jurídicas, consúltese la **[[Evaluación de impacto en la protección de datos personales (EIPDP)]]**. Este inventario describe los sistemas de almacenamiento y los controles de seguridad asociados a cada categoría de dato.

La plataforma está diseñada para atender un volumen proyectado de hasta **10,000 usuarios registrados históricos** en la región universitaria Coatzacoalcos-Minatitlán (la concurrencia operativa máxima dependerá de las pruebas de carga técnica del servidor), cifra que determina el nivel de los controles implementados.

### 1.1 Inventario Operativo

| Categoría | Dato Específico | Almacenamiento Temporal (Cliente) | Almacenamiento Definitivo (Servidor) | Controles de Seguridad |
|---|---|---|---|---|
| **Identificativo** | Nombre completo | Base de datos local cifrada del dispositivo | Base de datos central del servidor institucional | Cifrado en reposo; validación de integridad al sincronizar |
| **Electrónico** | Correo electrónico / Teléfono | Base de datos local cifrada (solo en sesión activa) | Base de datos central — cifrado a nivel de columna en campos de contacto | Cifrado de columna; acceso restringido al Administrador de TI |
| **Autenticación** | Credencial de acceso (Contraseña) | No se almacena. Se procesa en memoria RAM únicamente durante el inicio de sesión o registro. | Servidor central — únicamente el valor derivado mediante algoritmo de hash irreversible | Hash unidireccional; sin almacenamiento de texto plano |
| **Capacidad Jurídica** | Indicador de mayoría de edad (booleano) | Base de datos local cifrada | Base de datos central | No expuesto en la interfaz de usuario final |
| **Representación Legal (Menores)** | Nombre y correo del tutor legal | Base de datos local — cola de sincronización local | Base de datos central — campos cifrados a nivel de columna | Cifrado de columna; eliminación automática al confirmarse la mayoría de edad del titular |
| **Académico / Progreso** | Niveles superados, puntos de experiencia, insignias, racha diaria | Base de datos local — cola de eventos offline | Base de datos central — registros de progreso, insignias y bitácora de experiencia académica | Validación de integridad al sincronizar; registro de auditoría en la bitácora de experiencia |
| **Técnico / Sesión** | Token de sesión (stateless, vigencia corta) | Almacenamiento seguro del cliente. Vigencia del token de acceso: 15 minutos. | No se almacena en el servidor | Expiración corta; validación de firma criptográfica en cada petición |

### 1.2 Gestión de Claves de Cifrado

| Elemento | Descripción |
|---|---|
| **Claves de cifrado de columna** | Gestionadas por el Administrador de TI. Almacenadas fuera del repositorio de código fuente. Toda rotación de clave debe quedar documentada en el Historial de Cambios de este documento. |
| **Clave de sesión local del dispositivo** | Generada dinámicamente por sesión. Se elimina de la memoria RAM al cerrar la aplicación cliente o al detectar inactividad. El archivo de base de datos local residual en disco permanece cifrado e ilegible sin dicha clave. |
| **Clave de verificación de integridad** | Utilizada para detectar modificaciones no autorizadas en los datos almacenados localmente durante el modo offline. Este control está diseñado para identificar manipulaciones casuales; no debe considerarse un mecanismo absolutamente robusto ante ataques dirigidos sobre el ejecutable del cliente. Su complemento principal es la validación de consistencia de datos realizada de forma independiente en el servidor al momento de la sincronización. |

---

## 2. Inventario y Clasificación de Activos

| ID | Activo | Tipo | Ubicación | Propietario / Custodio | Clasificación | Criticidad |
|---|---|---|---|---|---|---|
| **A-01** | Servidor institucional On-Premise | Hardware | Instalaciones de la USBI | Director de la USBI / Administrador de TI | Restringido | **Crítica** |
| **A-02** | Motor de base de datos central | Software | Servidor institucional (A-01) | Administrador de TI | Confidencial | **Crítica** |
| **A-03** | Base de datos de usuarios y progreso | Datos | Servidor institucional (A-01) | Responsable del Tratamiento (UV-USBI) | Confidencial | **Crítica** |
| **A-04** | Respaldos cifrados de la base de datos | Datos | Servidor institucional (A-01) y servidor de la DGTI-UV | Administrador de TI / DGTI-UV (bajo convenio) | Confidencial | **Crítica** |
| **A-05** | Certificado TLS / Conexión segura | Software / Criptografía | Servidor institucional (A-01) | Administrador de TI | Restringido | **Alta** |
| **A-06** | Código fuente del sistema | Software | Repositorio de desarrollo | Desarrollador / Encargado Técnico | Interno | **Alta** |
| **A-07** | Bitácoras del sistema y de auditoría | Datos | Servidor institucional (A-01) | Administrador de TI | Restringido | **Alta** |
| **A-08** | Cliente de escritorio instalado en terminales de la biblioteca | Software | Terminales de uso público, USBI | Administrador de TI | Interno | **Alta** |
| **A-09** | Dominio y configuración DNS | Servicio de red | Proveedor externo | Administrador de TI | Restringido | **Alta** |
| **A-10** | Configuración del servidor (variables de entorno y credenciales) | Datos | Servidor institucional (A-01) — fuera del repositorio de código | Administrador de TI | Confidencial | **Crítica** |
| **A-11** | Este Documento de Seguridad | Documento | Bóveda documental de la USBI | Director de la USBI | Restringido | **Media** |

---

## 3. Clasificación de la Información

### 3.0 Nivel de Seguridad del Sistema

> **Nivel de Seguridad Aplicable al Sistema: MEDIO**
>
> Conforme a la normatividad estatal y los lineamientos del Sistema Nacional de Transparencia, el presente sistema se clasifica en el **Nivel de Seguridad Medio**, en razón de los siguientes factores concurrentes:
> - Tratamiento de datos identificativos y de contacto electrónico de usuarios en general.
> - Tratamiento de datos de representación legal de **menores de edad** (nombre y correo del tutor legal), con consentimiento parental mediante Doble Opt-In.
> - Resguardo de credenciales de acceso derivadas mediante algoritmo de hash irreversible.
>
> Esta clasificación determina la aplicación de todas las medidas técnicas, físicas y administrativas descritas en las secciones siguientes del presente documento.

| Tipo de Información | Clasificación | Descripción |
|---|---|---|
| Datos personales de los usuarios (nombre, contacto electrónico) | **Confidencial** | Acceso restringido al sistema y al Administrador de TI. No se comparten con terceros. |
| Credenciales de acceso derivadas (hash irreversible) | **Confidencial** | Acceso exclusivo del motor de base de datos. Nunca se exponen a nivel de aplicación. |
| Datos del tutor legal de usuarios menores de edad | **Confidencial** | Acceso restringido. Se eliminan automáticamente al confirmarse la mayoría de edad del titular. |
| Bitácoras del sistema y registros de auditoría | **Restringido** | Acceso limitado al Administrador de TI y al Director de la USBI para fines de auditoría interna. |
| Configuración del servidor y credenciales de administración | **Confidencial** | Acceso exclusivo del Administrador de TI. Jamás debe incluirse en repositorios de código. |
| Aviso de Privacidad Integral y Simplificado | **Público** | Disponible para cualquier usuario a través de la interfaz de la plataforma. |
| Manual de usuario de la plataforma | **Público** | Disponible sin restricciones. |
| Este Documento de Seguridad | **Restringido** | Distribuido conforme al apartado "Distribución Autorizada". |

---

## 4. Funciones y Obligaciones del Personal

La institución implementa una segregación de funciones basada en el Principio de Mínimo Privilegio. Cada rol tiene acceso exclusivamente a los recursos que requiere para el cumplimiento de sus funciones.

### 4.1 Matriz de Control de Accesos

| Rol / Perfil | Nivel de Acceso Técnico | Funciones y Obligaciones de Seguridad |
|---|---|---|
| **Director de la USBI (Responsable del Tratamiento)** | Acceso al panel administrativo del cliente de escritorio. Sin acceso directo al servidor institucional. | Autorizar altas y bajas de personal con acceso al sistema. Coordinar solicitudes ARCO canalizadas por la CUTAI. Supervisar el cumplimiento de este documento. Firmar formalmente la aceptación de los riesgos residuales documentados. |
| **Administrador de Infraestructura (TI UV)** | Acceso físico y lógico al servidor institucional (sistema operativo y motor de base de datos). | Administrar el servidor conforme a los procedimientos establecidos. Ejecutar y verificar los respaldos periódicos. Gestionar y rotar las claves de cifrado de columna. Mantener la bitácora de accesos administrativos. Prohibido compartir credenciales. |
| **Desarrollador / Encargado Técnico** | Acceso al código fuente (repositorio de desarrollo). Sin acceso a la base de datos de producción. | Implementar y mantener los controles de seguridad por diseño. Aplicar parches conforme al procedimiento de gestión de cambios. Documentar en el Historial de Cambios toda modificación a los controles de seguridad. |
| **Personal Administrativo / Bibliotecarios USBI** | Acceso como operadores de atención a través del cliente de escritorio en terminales de la biblioteca. | Supervisar el uso correcto de las terminales públicas. Asegurar el cierre de sesión al término de cada turno. Canalizar incidentes detectados al Director de la USBI. Prohibido solicitar contraseñas a los usuarios. |
| **DGTI-UV (Persona Encargada)** | Acceso de escritura al servidor destinatario de los respaldos cifrados, bajo convenio de encargo de tratamiento. | Custodiar los respaldos cifrados recibidos. Garantizar que los archivos no sean descifrados, alterados ni distribuidos fuera de los términos del convenio. |

### 4.2 Protocolo de Autenticación y Trazabilidad

1. **Identificación Inequívoca:** Toda persona con acceso al servidor o a los paneles administrativos debe contar con credenciales nominales e individuales. Las cuentas compartidas o genéricas están prohibidas.
2. **Gestión de Credenciales Administrativas:** Las contraseñas de administración se asignan conforme a un procedimiento documentado que garantiza su confidencialidad y almacenamiento seguro.
3. **Registro de Auditoría (Logs):** Todas las operaciones de consulta, modificación y borrado realizadas directamente sobre el servidor generan un registro en la bitácora del sistema operativo. El Administrador de TI es responsable de su monitoreo periódico.
4. **Baja de Personal:** Al producirse la baja de un integrante del equipo con acceso al sistema, el Administrador de TI revocará sus credenciales en un plazo no mayor a 24 horas. El Director de la USBI firmará el acta correspondiente.

---

## 5. Seguridad Física

### 5.1 Control de Acceso al Área de Servidores

| Medida | Descripción |
|---|---|
| **Acceso físico restringido** | El servidor institucional se ubica en un área de acceso controlado. Solo el Administrador de TI y el personal expresamente autorizado por el Director de la USBI pueden ingresar. |
| **Bitácora de acceso físico** | Toda visita al área de servidores queda registrada con nombre, cargo, fecha, hora de entrada y hora de salida. |
| **Visitantes y proveedores** | Ningún visitante o proveedor externo puede ingresar al área de servidores sin la presencia de personal de TI autorizado. |

### 5.2 Condiciones Ambientales del Servidor

| Medida | Estado | Responsable de Verificación |
|---|---|---|
| Suministro eléctrico regulado (UPS) | _(Verificar y documentar antes del despliegue)_ | Administrador de TI |
| Control de temperatura del área | _(Verificar y documentar antes del despliegue)_ | Administrador de TI |
| Protección contra incendio | _(Verificar y documentar antes del despliegue)_ | Director de la USBI |
| Protección contra inundación | _(Verificar y documentar antes del despliegue)_ | Director de la USBI |

> **Acción requerida antes del despliegue:** El Director de la USBI y el Administrador de TI deben verificar y completar el estado real de las condiciones físicas del cuarto de servidores, actualizando este apartado en la siguiente versión del documento.

### 5.3 Terminales de Uso Público (Biblioteca)

- Las terminales cuentan con configuración de bloqueo automático de pantalla por inactividad. Esta función no puede desactivarse bajo ninguna circunstancia.
- Los equipos están sujetos a la **Política de Pantalla Limpia**: al finalizar la jornada, el personal verifica que ninguna sesión quede abierta.
- La instalación de software no autorizado en las terminales de la biblioteca está estrictamente prohibida.

---

## 6. Análisis de Riesgos

De conformidad con la LGPDPPSO y la Ley Número 251, se evalúan las amenazas activas contra las vulnerabilidades de la plataforma. El análisis cubre riesgos de índole técnica, física, operativa y legal.

| ID | Amenaza | Vulnerabilidad | Probabilidad | Impacto | Control Implementado | Riesgo Residual |
|---|---|---|---|---|---|---|
| **R-01** | Acceso no autorizado a sesión previa en terminal compartida | Equipos públicos compartidos entre múltiples usuarios | Alta | Alto | **MITIGAR:** La clave de cifrado de la base de datos local se elimina de memoria al cerrar la aplicación o por inactividad. El archivo residual en disco queda cifrado e ilegible. | Bajo |
| **R-02** | Manipulación de datos de progreso académico en el dispositivo del usuario | El almacenamiento local está bajo control físico del usuario en modo offline | Media | Medio | **MITIGAR:** Verificación de integridad de los datos offline al sincronizar. Datos inconsistentes son rechazados y registrados para revisión. La conducta se atiende conforme al Estatuto de los Alumnos 2008. | Bajo |
| **R-03** | Caída del servicio por saturación del almacenamiento del servidor | Capacidad de almacenamiento limitada del servidor institucional | Media | Alto | **MITIGAR / TRANSFERIR:** Respaldos periódicos comprimidos con política estricta de retención. Los respaldos excedentes se remiten cifrados a la DGTI-UV bajo convenio de encargo de tratamiento. | Medio |
| **R-04** | Robo o uso no autorizado de un token de sesión activo | El sistema utiliza autenticación stateless sin capacidad de revocación instantánea | Alta | Alto | **ACEPTAR (riesgo residual documentado y asumido formalmente por el Director de la USBI):** El token de acceso tiene una vigencia máxima de 15 minutos. | Medio |
| **R-05** | Exfiltración de datos hacia infraestructura externa no autorizada | Riesgo operativo si se incumpliera la política institucional de soberanía de datos | Baja | Alto | **EVITAR:** La política institucional prohíbe el alojamiento de la base de datos en servicios de cómputo en la nube de terceros. Todo procesamiento se realiza en infraestructura de la UV. | Bajo |
| **R-06** | Acceso físico no autorizado al servidor | Controles físicos del área de servidores no formalmente verificados al momento de la elaboración | Media | Alto | **MITIGAR:** Control de acceso al área, bitácora de visitas y cifrado de los datos en reposo. Verificación pendiente de las condiciones ambientales (Sección 5.2). | Medio |
| **R-07** | Error humano del Administrador de TI (borrado o modificación accidental) | Acceso privilegiado al servidor con herramientas de alto impacto operativo | Media | Alto | **MITIGAR:** Bitácora de operaciones administrativas. Política de respaldos verificados que permite restauración. Principio de mínimo privilegio. | Medio |
| **R-08** | Incumplimiento normativo por error administrativo en el tratamiento | Falta de capacitación o procedimientos no actualizados conforme a cambios legislativos | Media | Alto | **MITIGAR:** Programa periódico de capacitación (Sección 17). Procedimiento de actualización del documento ante cambios en la legislación (Sección 18). Supervisión de la CUTAI. | Bajo |
| **R-09** | Divulgación accidental de datos por error del personal | Personal con acceso a información de usuarios en el ejercicio de sus funciones de soporte | Media | Medio | **MITIGAR:** Principio de mínimo privilegio. Deber de confidencialidad incluido en la capacitación. Prohibición expresa de compartir contraseñas de usuarios (Sección 17.2). | Bajo |
| **R-10** | Atención de derechos ARCO fuera del plazo legal | Falta de un procedimiento formal de seguimiento de solicitudes ARCO | Media | Alto | **MITIGAR:** Canal oficial de atención a través de la CUTAI. KPI-06 mide el cumplimiento dentro de plazo. El Director de la USBI es responsable de asegurar la respuesta oportuna. | Bajo |

---

## 7. Análisis de Brecha (Gap Analysis)

| Requerimiento Normativo | Estado Implementado | Brecha Identificada | Mitigación Aceptada |
|---|---|---|---|
| **Control de Acceso y Revocación de Sesiones** (LGPDPPSO Arts. 31, 34) | Autenticación stateless mediante tokens de sesión de vigencia corta (access token: 15 minutos; refresh token: 7 días) | No existe revocación instantánea de tokens. Un token emitido es válido hasta su expiración aunque la cuenta sea suspendida. | **Brecha Aceptada.** La implementación de un mecanismo de revocación en tiempo real requeriría un servicio de estado en memoria incompatible con la capacidad del servidor institucional. Mitigación: vigencia ultracorta del token de acceso. Asumida formalmente por el Director de la USBI. |
| **Disponibilidad y Continuidad (DRP)** | Respaldos periódicos comprimidos y transferidos a la DGTI-UV | El servidor institucional no cuenta con redundancia en alta disponibilidad. Una falla del hardware interrumpe el servicio hasta su restauración. | **Brecha Aceptada.** La infraestructura institucional actual no permite redundancia multi-nodo. Mitigación: respaldos verificados y proceso de restauración documentado con RPO/RTO definidos en la Sección 13. |
| **Auditoría de Eventos y Trazabilidad** | Registro en bitácora del sistema operativo y bitácora de experiencia académica interna (para auditorías de integridad) | No existe un sistema especializado de monitoreo y alertas en tiempo real (SIEM). | **Brecha Aceptada.** El hardware del servidor institucional no soporta herramientas SIEM comerciales. Mitigación: revisión asíncrona periódica de registros y validaciones de integridad programadas. |
| **Destrucción Segura de Información (Derecho ARCO — Cancelación)** | Orden de borrado remoto enviada al cliente de escritorio en la siguiente sincronización | Si el dispositivo del usuario nunca vuelve a conectarse, el archivo local cifrado persiste en el disco del usuario. | **Brecha Aceptada (límite técnico offline).** La UV cumple su obligación al purgar los datos del servidor central. El archivo local residual permanece cifrado e ilegible. La institución queda exenta de responsabilidad sobre dispositivos fuera de su control técnico. |

---

## 8. Gestión de Proveedores Externos

| Proveedor / Servicio | Tipo | Datos del titular involucrados | Medida de Gestión |
|---|---|---|---|
| **Proveedor del dominio y DNS** | Servicio de conectividad de red | No accede a datos personales de los usuarios | Verificación periódica de configuración de DNS y vigencia del registro de dominio |
| **Proveedor del certificado de seguridad (TLS)** | Seguridad de comunicaciones | No accede a datos personales; únicamente a metadatos de conexión | Monitoreo de fecha de vencimiento; renovación programada dentro del Plan de Trabajo (PT-11) |
| **Proveedor del hardware del servidor** | Infraestructura física en instalaciones de la UV | Acceso físico al equipo, no a los datos | Aplicar cláusulas de confidencialidad en caso de mantenimiento físico por personal externo; registrar en bitácora de acceso físico |
| **DGTI-UV (Persona Encargada)** | Almacenamiento secundario institucional | Custodia de respaldos cifrados de la base de datos | Convenio formal de encargo de tratamiento suscrito antes de la primera remisión; la DGTI-UV no posee las claves de descifrado |
| **Proveedor de correo electrónico institucional UV** | Envío de notificaciones y enlaces de verificación de tutores | Dirección de correo del tutor (para envío del enlace de verificación del consentimiento parental) | Uso de cuenta institucional de la UV; el enlace de verificación tiene caducidad de 24 horas |

> **Nota sobre custodia de claves de respaldo:** Los respaldos transferidos a la DGTI-UV viajan cifrados. Las claves de descifrado son custodiadas exclusivamente por el Administrador de TI de la USBI, garantizando que la DGTI-UV no pueda acceder al contenido de los datos.

---

## 9. Gestión de Cambios

### 9.1 Situaciones que Requieren Gestión de Cambios

Este procedimiento aplica ante cualquier modificación a:
- El servidor institucional (hardware, sistema operativo, componentes tecnológicos)
- Los controles de seguridad implementados (cifrado, autenticación, respaldos)
- Las categorías de datos personales tratados o sus finalidades
- Las políticas o procedimientos descritos en este documento
- La legislación aplicable

### 9.2 Procedimiento de Cambios

| Paso | Acción | Responsable |
|---|---|---|
| 1. Solicitud | Documentar el cambio propuesto: descripción, motivo, impacto estimado en seguridad y fecha propuesta. | Quien propone el cambio |
| 2. Evaluación | Valorar el impacto del cambio en los controles de seguridad y en los datos personales tratados. | Encargado Técnico + Administrador de TI |
| 3. Autorización | El Director de la USBI autoriza formalmente el cambio. Los cambios de alto impacto se notifican a la CUTAI. | Director de la USBI |
| 4. Implementación | Implementar el cambio, preferentemente en un entorno de pruebas antes de aplicarlo al servidor de producción. | Encargado Técnico / Administrador de TI |
| 5. Documentación | Registrar el cambio en el Historial de Cambios de este documento y en el registro técnico del sistema. | Quien implementó el cambio |

---

## 10. Gestión de Vulnerabilidades

| Actividad | Descripción | Frecuencia | Responsable |
|---|---|---|---|
| **Detección** | Revisión de boletines de seguridad de los componentes tecnológicos y librerías que conforman el sistema. | Mensual | Encargado Técnico |
| **Evaluación** | Clasificación de la vulnerabilidad detectada según su impacto potencial sobre los datos personales: Crítica, Alta, Media o Baja. | Ante cada vulnerabilidad detectada | Encargado Técnico + Administrador de TI |
| **Decisión de corrección** | Autorización de la aplicación del parche, siguiendo el procedimiento de Gestión de Cambios (Sección 9). | Ante cada vulnerabilidad evaluada | Director de la USBI |
| **Plazos de corrección** | Crítica: ≤ 72 horas. Alta: ≤ 7 días. Media: ≤ 30 días. Baja: siguiente ciclo de mantenimiento semestral. | — | Encargado Técnico |
| **Registro** | La vulnerabilidad detectada, su clasificación y la corrección aplicada quedan documentadas en la bitácora de vulnerabilidades y en el Historial de Cambios. | Ante cada evento | Encargado Técnico |

---

## 11. Gestión de Medios de Almacenamiento

| Situación | Procedimiento | Responsable |
|---|---|---|
| **Sustitución de disco del servidor** | Antes de retirar el disco, aplicar un procedimiento de borrado seguro certificado adecuado al tipo de almacenamiento (para discos de estado sólido: *ATA Secure Erase* o método equivalente certificado; para discos magnéticos: sobreescritura segura). Si el disco no es funcional, se destruye físicamente. Se documenta en bitácora. | Administrador de TI |
| **Eliminación de respaldos excedentes** | Los respaldos que superan el período de retención se eliminan del servidor local mediante borrado seguro certificado. El excedente en la DGTI-UV se gestiona conforme al convenio de encargo de tratamiento. | Administrador de TI |
| **Dispositivos de almacenamiento portátiles** | El uso de dispositivos de almacenamiento portátiles en el servidor institucional está restringido y debe autorizarse por el Director de la USBI. Todo dispositivo utilizado en el servidor debe ser sometido a borrado seguro certificado antes de reutilizarse. | Administrador de TI |
| **Equipos de cómputo de biblioteca dados de baja** | Antes de retirar una terminal pública de servicio, el Administrador de TI desinstala la aplicación cliente y aplica borrado seguro certificado al almacenamiento local del equipo. Se documenta en bitácora. | Administrador de TI |

---

## 12. Procedimiento de Respuesta a Incidentes de Seguridad

Un **incidente de seguridad** es cualquier evento que comprometa o pueda comprometer la confidencialidad, integridad o disponibilidad de los datos personales tratados.

### 12.1 Flujo de Respuesta

```
1. DETECCIÓN
   ↓  El personal identifica o es notificado de un posible incidente.
2. CONTENCIÓN
   ↓  Aislar el sistema afectado, suspender cuentas comprometidas
      o revocar accesos si aplica.
      Objetivo: < 2 horas desde la detección.
3. EVALUACIÓN DEL ALCANCE
   ↓  ¿Qué datos? ¿Cuántos titulares? ¿Qué tipo de vulneración?
      ¿Es un incidente activo o un hallazgo histórico?
4. NOTIFICACIÓN INTERNA
   ↓  Director de la USBI + Administrador de TI + CUTAI.
      Plazo: inmediato, sin dilación injustificada.
5. NOTIFICACIÓN A LOS TITULARES AFECTADOS
   ↓  Por correo electrónico registrado.
      Plazo: sin dilación, conforme a los plazos previstos en la
      LGPDPPSO y la Ley Número 251.
6. NOTIFICACIÓN A LA AUTORIDAD GARANTE
   ↓  CUTAI → Contraloría General del Estado / Órgano Interno de Control.
      Plazo: sin dilación, conforme a la normativa aplicable.
7. ERRADICACIÓN Y RECUPERACIÓN
   ↓  Corrección de la causa raíz. Restauración desde respaldo si aplica.
8. DOCUMENTACIÓN Y LECCIONES APRENDIDAS
      Registro en Bitácora de Incidentes. Actualización de este documento
      si se identifican nuevos riesgos o controles necesarios.
```

### 12.2 Contenido Mínimo de la Notificación a los Titulares

- Descripción del incidente (qué ocurrió, cuándo se detectó)
- Categorías y cantidad aproximada de datos personales afectados
- Posibles consecuencias para los titulares
- Medidas adoptadas de forma inmediata
- Datos de contacto de la CUTAI para ejercer derechos ARCO

### 12.3 Bitácora de Incidentes

El Administrador de TI mantiene una bitácora de incidentes con los siguientes campos: fecha de detección, descripción del incidente, activos afectados, titulares impactados, acciones de contención, fecha de resolución y lecciones aprendidas.

---

## 13. Plan de Continuidad Operativa

### 13.1 Objetivos de Recuperación

| Parámetro | Valor Objetivo | Descripción |
|---|---|---|
| **RPO** | 24 horas | Pérdida máxima aceptable de datos. Los respaldos diarios garantizan que, en el peor caso, se recupere el estado del sistema del día anterior. |
| **RTO** | 48 horas | Tiempo máximo aceptable de interrupción del servicio antes de restablecer la operación básica. |

### 13.2 Plan de Recuperación ante Desastres (DRP)

| Escenario | Acciones de Recuperación | Responsable |
|---|---|---|
| **Falla del servidor (hardware)** | 1. Notificar al Director de la USBI. 2. Solicitar equipo de reemplazo. 3. Restaurar el sistema operativo. 4. Restaurar la base de datos desde el respaldo más reciente disponible en la DGTI-UV. 5. Verificar integridad de los datos restaurados. 6. Reactivar el servicio y notificar a los usuarios. | Administrador de TI |
| **Saturación del almacenamiento** | 1. Verificar el estado del disco del servidor. 2. Ejecutar la remisión urgente de respaldos a la DGTI-UV. 3. Purgar los respaldos excedentes del servidor local. 4. Revisar la política de retención si el incidente es recurrente. | Administrador de TI |
| **Corrupción de la base de datos** | 1. Detener el servicio. 2. Identificar el respaldo previo a la corrupción. 3. Restaurar y verificar la integridad. 4. Analizar la causa raíz antes de reactivar el servicio. | Administrador de TI |

### 13.3 Procedimiento de Respaldo

| Elemento | Especificación |
|---|---|
| Tipo de respaldo | Respaldo completo de la base de datos del servidor central |
| Formato | Exportación comprimida con algoritmo de alta eficiencia para optimizar el almacenamiento local |
| Frecuencia | Diario (ejecutado mediante tarea automatizada programada) |
| Retención local y de red | Conforme al Convenio Institucional: Diarios (7 días), Semanales (4 semanas), Mensuales (3 meses) |
| Destino de excedentes | Servidor de la DGTI-UV mediante remisión cifrada y segura (bajo convenio de encargo de tratamiento) |
| Verificación | Prueba de restauración semestral documentada (PT-06) |

---

## 14. Política de Conservación Documental

| Tipo de Registro | Período de Conservación | Responsable de Custodia |
|---|---|---|
| **Este Documento de Seguridad** (versiones anteriores) | Mínimo 5 años desde su sustitución por una versión más reciente | Director de la USBI |
| **Bitácora de incidentes de seguridad** | Mínimo 5 años desde el cierre del incidente | Administrador de TI |
| **Bitácoras del sistema operativo (logs)** | Mínimo 1 año desde su generación | Administrador de TI |
| **Bitácora de auditoría de experiencia académica** | Mientras exista la cuenta del usuario + 1 año adicional | Administrador de TI |
| **Bitácora de acceso físico al área de servidores** | Mínimo 2 años desde cada registro | Director de la USBI |
| **Actas de capacitación y firmas de asistencia** | Mínimo 3 años desde cada sesión | Director de la USBI |
| **Actas de simulacros de recuperación (DRP)** | Mínimo 3 años desde cada simulacro | Administrador de TI |
| **Actas de revisión de privilegios** | Mínimo 3 años desde cada revisión | Administrador de TI |
| **Solicitudes ARCO y sus respuestas** | Mínimo 3 años desde la resolución | Director de la USBI / CUTAI |
| **Registro de vulnerabilidades detectadas y parches aplicados** | Mínimo 3 años desde cada evento | Encargado Técnico |

---

## 15. Plan de Trabajo (Programa de Implementación y Mantenimiento)

| ID | Tarea | Frecuencia | Responsable | Evidencia de Cumplimiento |
|---|---|---|---|---|
| **PT-01** | Monitoreo de disponibilidad de almacenamiento del servidor | Semanal | Administrador de TI | Reporte automático de uso de disco enviado a la Dirección |
| **PT-02** | Ejecución de respaldos y remisión de excedentes a la DGTI-UV | Diario (automático) / Revisión manual mensual | Administrador de TI | Bitácora de ejecución de tarea automatizada |
| **PT-03** | Verificación de cierre de sesión en terminales públicas al cierre de instalaciones | Diario | Bibliotecarios USBI | Bitácora de cierre de instalaciones firmada |
| **PT-04** | Revisión de registros de integridad de datos y anomalías de sincronización | Mensual | Encargado Técnico | Reporte de anomalías turnado a la Dirección |
| **PT-05** | Auditoría de control de accesos (revisión de cuentas y privilegios activos) | Trimestral | Director de la USBI / Administrador de TI | Acta de revisión de privilegios |
| **PT-06** | Simulacro de restauración de respaldo (DRP) | Semestral | Administrador de TI | Acta de simulacro de recuperación exitosa |
| **PT-07** | Aplicación de parches de seguridad a los componentes del sistema | Semestral (o ante parche crítico) | Encargado Técnico | Registro de versiones actualizado |
| **PT-08** | Revisión de boletines de vulnerabilidades conocidas en los componentes del sistema | Mensual | Encargado Técnico | Registro en la bitácora de vulnerabilidades |
| **PT-09** | Verificación de condiciones físicas del área de servidores | Trimestral | Director de la USBI + Administrador de TI | Reporte de revisión física |
| **PT-10** | Revisión y actualización de este documento | Anual (o ante cambio material) | Director de la USBI + CUTAI | Nueva versión con Historial de Cambios actualizado |
| **PT-11** | Monitoreo de la vigencia del certificado de seguridad (TLS) y del registro de dominio | Mensual | Administrador de TI | Alerta de vencimiento atendida con ≥ 30 días de anticipación |

---

## 16. Mecanismos de Monitoreo y Revisión

El monitoreo de seguridad sigue el ciclo **PHVA** (Planificar-Hacer-Verificar-Actuar).

### 16.1 Indicadores Clave de Desempeño (KPIs)

Los indicadores técnicos son inicialmente teóricos y deberán ajustarse con valores de referencia reales durante los primeros 90 días de operación en producción.

#### Indicadores técnicos

| ID | Indicador | Objetivo Inicial | Responsable |
|---|---|---|---|
| **KPI-01** | Tasa de rechazo de sincronizaciones por datos con integridad inválida | < 1 % de las peticiones de sincronización | Encargado Técnico |
| **KPI-02** | Disponibilidad de almacenamiento del servidor | > 20 % de espacio libre disponible | Administrador de TI |
| **KPI-03** | Consumo de recursos del servidor (memoria y procesador) | Dentro del umbral de operación estable del servidor institucional | Administrador de TI |
| **KPI-04** | Número de incidentes de seguridad por período | 0 incidentes de severidad crítica por trimestre | Director de la USBI |
| **KPI-05** | Cumplimiento del plan de respaldos automatizados | 100 % de ejecuciones exitosas por mes | Administrador de TI |

#### Indicadores administrativos

| ID | Indicador | Objetivo | Responsable |
|---|---|---|---|
| **KPI-06** | Solicitudes ARCO atendidas dentro del plazo legal | 100 % de solicitudes resueltas en tiempo | Director de la USBI / CUTAI |
| **KPI-07** | Sesiones de capacitación realizadas conforme al plan anual | 100 % del plan cumplido por período | Director de la USBI |
| **KPI-08** | Incidentes de seguridad cerrados dentro del RTO definido | 100 % de incidentes resueltos dentro del RTO de 48 horas | Administrador de TI |
| **KPI-09** | Revisiones periódicas del documento realizadas conforme a lo programado | 100 % (1 revisión anual + revisiones por cambio material) | Director de la USBI |

### 16.2 Mecanismo de Verificación de Integridad de Datos Offline

El sistema implementa un procedimiento de verificación de integridad sobre los datos generados localmente durante el modo offline. Al momento de la sincronización, el servidor realiza de forma independiente una validación de consistencia de los datos recibidos, verificando que el progreso reportado sea congruente con los eventos registrados. Los datos que no superen esta validación son rechazados y el evento queda registrado en la bitácora de auditoría para su revisión. Este control está diseñado como primera capa de detección de manipulaciones; su complemento es la revisión periódica de los registros de auditoría conforme al PT-04.

### 16.3 Revisión Directiva

El Director de la USBI revisará trimestralmente los reportes de KPIs e incidentes. Ante anomalías en KPI-01, KPI-04 o KPI-08, se activará el Procedimiento de Gestión de Cambios (Sección 9) o el Procedimiento de Respuesta a Incidentes (Sección 12), según corresponda.

---

## 17. Programa General de Capacitación y Concientización

### 17.1 Plan de Capacitación por Perfil

| Perfil | Frecuencia | Temas |
|---|---|---|
| **Administrador de TI UV** | Semestral | Procedimientos de respaldo y restauración, monitoreo del servidor, gestión de incidentes, rotación de claves de cifrado, gestión de cambios, borrado seguro certificado de medios. |
| **Desarrollador / Encargado Técnico** | Anual | Privacidad por Diseño, gestión de vulnerabilidades, actualización de controles de seguridad, ciclo de vida seguro del desarrollo de software. |
| **Personal Administrativo y Bibliotecarios USBI** | Trimestral (o al ingresar) | Confidencialidad y deber de reserva, canalización de solicitudes ARCO a la CUTAI, operación segura de terminales compartidas, protocolo de reporte de incidentes visibles. |

### 17.2 Instrucciones Operativas para Terminales Compartidas

- **Cierre de sesión obligatorio:** Al finalizar el turno de cada usuario, el personal supervisa el cierre correcto de la aplicación. Esta acción elimina la clave de cifrado de sesión activa de la memoria del equipo.
- **Política de pantalla limpia:** Los equipos cuentan con bloqueo automático de pantalla por inactividad. Esta configuración no puede desactivarse.
- **Prohibición de asistencia con credenciales:** El personal no solicitará ni manipulará contraseñas de los usuarios. La recuperación de cuenta se gestiona únicamente por el mecanismo automatizado del sistema.
- **Reporte de incidentes visibles:** Si el personal detecta intentos de manipulación del sistema, suspenderá el uso del equipo de inmediato y notificará al Director de la USBI para la aplicación del protocolo disciplinario correspondiente.

### 17.3 Evidencias de Capacitación

_(Se completará conforme se realicen las sesiones)_

| Sesión | Fecha | Participantes | Tema | Material entregado | Resultado |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

### 17.4 Sanciones por Incumplimiento

La inobservancia de los protocolos descritos en este programa, así como el incumplimiento del deber de confidencialidad, constituirá una infracción a la Ley Número 251 y a la normatividad laboral o académica de la Universidad Veracruzana, dando lugar a las sanciones correspondientes.

---

## 18. Procedimiento de Actualización de este Documento

Este documento deberá revisarse y actualizarse cuando ocurra cualquiera de las siguientes situaciones:

- Cambio en la infraestructura del servidor (hardware, sistema operativo, componentes tecnológicos)
- Incorporación o supresión de categorías de datos tratados
- Modificación de los controles de seguridad implementados
- Ocurrencia de un incidente de seguridad que revele nuevas vulnerabilidades o controles necesarios
- Cambio en la legislación aplicable (Ley 251, LGPDPPSO o lineamientos del SNT)
- Cambio de personal con funciones clave en el tratamiento de datos

Toda actualización deberá quedar registrada en el **Historial de Cambios** del Control Documental y ser autorizada por el Director de la USBI. La CUTAI debe ser notificada de cualquier cambio que afecte los controles de tratamiento de datos personales.

---

## Firmas de Aprobación

**Elaboró:**

**Nombre:** ___________________________________
**Cargo:** ___________________________________
**Fecha:** _________________________
**Firma:** ___________________________________

---

**Opinión Técnica (CUTAI):**

**Nombre:** ___________________________________
**Cargo:** Coordinación Universitaria de Transparencia, Acceso a la Información y Protección de Datos Personales
**Fecha:** _________________________
**Firma:** ___________________________________

---

**Autorizó:**

**Nombre:** ___________________________________
**Cargo:** Director/a de la USBI – Región Coatzacoalcos-Minatitlán
**Fecha:** _________________________
**Firma:** ___________________________________
