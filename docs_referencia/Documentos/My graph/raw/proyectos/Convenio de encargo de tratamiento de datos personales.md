---
fecha: 2026-07-09
tags:
  - usbi
  - convenio
  - dgti-uv
---
**Conceptos y Tecnologías Base:** [[Proyecto de la USBI]]
**Complementa a:** Evaluación de impacto en la protección de datos personales (EIPDP), Documento de seguridad, Condiciones y acuerdos de la USBI, Plan integración

---

# INSTRUMENTO JURÍDICO-ADMINISTRATIVO DE ENCARGO DE TRATAMIENTO

**Para la custodia institucional de respaldos del Sistema “Plataforma Educativa y Motor de Minijuegos – USBI”**

## Control Documental

| Campo | Valor |
|---|---|
| **Folio o Código Documental** | PENDIENTE DE ASIGNACIÓN |
| **Versión** | 2.1 |
| **Motivo de actualización** | Adecuación de fundamento normativo a legislación vigente y precisión de remisión responsable–persona encargada. |
| **Área emisora** | USBI - Región Coatzacoalcos-Minatitlán |
| **Área responsable de actualización** | Responsable Técnico USBI |
| **Periodicidad de revisión** | Anual o ante cambio material de infraestructura |

---

Con fundamento en los artículos 52, 53, 54, 55 y 56 de la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados, así como en los artículos correlativos de la Ley Número 251 de Protección de Datos Personales en Posesión de Sujetos Obligados para el Estado de Veracruz de Ignacio de la Llave, relativos a la relación entre responsable y persona encargada, se formaliza el presente instrumento jurídico-administrativo de encargo de tratamiento de datos personales, relativo a la custodia institucional de respaldos cifrados del sistema denominado “Plataforma Educativa y Motor de Minijuegos – USBI”, que suscriben:

**I. EL RESPONSABLE:** La Universidad Veracruzana, a través de la Unidad de Servicios Bibliotecarios y de Información, región Coatzacoalcos-Minatitlán, en adelante “USBI”, representada por su Director/a en ejercicio de sus facultades institucionales.

**II. LA PERSONA ENCARGADA:** La Universidad Veracruzana, a través de la Dirección General de Tecnologías de la Información, en adelante “DGTI-UV”, en su calidad de área institucional encargada de proporcionar infraestructura tecnológica y servicios de almacenamiento secundario para la custodia de respaldos cifrados.

## DEFINICIONES

Para efectos del presente instrumento se entenderá por:

**Respaldo:** archivo cifrado y comprimido que contiene una copia exportada de la base de datos del sistema.
**Repositorio secundario:** espacio de almacenamiento institucional proporcionado por la DGTI-UV para la conservación de respaldos.
**Llave criptográfica:** elemento técnico bajo control exclusivo de la USBI, necesario para descifrar los respaldos.
**Restauración:** procedimiento mediante el cual la USBI recupera un respaldo custodiado para verificarlo o restablecer información.
**Supresión segura:** eliminación documentada de respaldos mediante mecanismos que impidan su recuperación no autorizada.

## DECLARACIONES Y ANTECEDENTES TÉCNICOS

**I.** EL RESPONSABLE opera el sistema denominado **“Plataforma Educativa y Motor de Minijuegos – USBI”**, bajo una arquitectura local institucional, con recursos de infraestructura previamente definidos: **1 vCPU, 1 GB de RAM y 20 GB de almacenamiento total**.

**II.** Debido a las limitaciones de almacenamiento del servidor principal, EL RESPONSABLE requiere conservar respaldos externos como parte de su estrategia de continuidad operativa y recuperación ante incidentes.

**III.** Los respaldos generados por EL RESPONSABLE consisten en archivos de base de datos producidos mediante herramientas de exportación, compresión y cifrado, conforme al *Documento de Seguridad* correspondiente.

**IV.** LA PERSONA ENCARGADA cuenta con infraestructura institucional para recibir y conservar dichos respaldos como repositorio secundario, sin intervenir en la operación funcional del sistema, sin explotar los datos personales y sin tener posesión ni acceso a las claves de descifrado correspondientes.

**V.** La transferencia de los respaldos se realizará mediante los mecanismos seguros normados en los **Anexos Integrantes** del presente instrumento.

## CLÁUSULAS

### PRIMERA. Objeto del instrumento

LA PERSONA ENCARGADA se obliga a recibir, almacenar y custodiar los archivos de respaldo cifrados y comprimidos generados por EL RESPONSABLE, exclusivamente para fines de continuidad operativa, recuperación ante desastres y preservación de la disponibilidad de la información.

LA PERSONA ENCARGADA no tendrá facultades para modificar, consultar, explotar, analizar, copiar, compartir o utilizar los datos personales contenidos en los respaldos para finalidades distintas a las expresamente instruidas por EL RESPONSABLE.

### SEGUNDA. Naturaleza de la remisión de respaldos

La transferencia técnica de respaldos cifrados desde la infraestructura de la USBI hacia el repositorio institucional de la DGTI-UV constituye una remisión de datos personales entre EL RESPONSABLE y LA PERSONA ENCARGADA, realizada exclusivamente para la prestación del servicio de custodia institucional de respaldos.

Dicha remisión no implica transferencia de titularidad, cesión de control, comunicación para finalidades propias ni autorización para que LA PERSONA ENCARGADA trate los datos personales con fines distintos a los instruidos por EL RESPONSABLE.

### TERCERA. Tratamiento por instrucciones documentadas y Derechos ARCO

LA PERSONA ENCARGADA actuará únicamente conforme a las instrucciones documentadas de EL RESPONSABLE. Cualquier operación distinta a la recepción, almacenamiento, conservación, devolución o supresión de respaldos deberá ser previamente autorizada por escrito por EL RESPONSABLE.

LA PERSONA ENCARGADA reconoce que carece de facultad jurídica y técnica para atender solicitudes de derechos ARCO. Cualquier solicitud recibida por LA PERSONA ENCARGADA deberá ser turnada inmediatamente a EL RESPONSABLE o a la CUTAI.

### CUARTA. Prohibición de finalidades distintas y Gestión de Claves

LA PERSONA ENCARGADA se abstendrá de tratar los datos personales contenidos en los respaldos para finalidades propias, estadísticas, administrativas, operativas, académicas, comerciales o de análisis técnico no autorizado.

Se establece expresamente que LA PERSONA ENCARGADA no posee, custodia ni tiene acceso a las llaves criptográficas de descifrado. Por tanto, LA PERSONA ENCARGADA está imposibilitado técnicamente para abrir, desencriptar, restaurar o consultar los respaldos. La pérdida o compromiso de dichas llaves por parte de EL RESPONSABLE no será imputable a LA PERSONA ENCARGADA.

Las llaves criptográficas necesarias para el descifrado de respaldos serán administradas exclusivamente por EL RESPONSABLE, a través del Responsable Técnico designado, conforme al procedimiento de gestión de claves previsto en el *Documento de Seguridad*.

### QUINTA. Medidas de Seguridad

LA PERSONA ENCARGADA se compromete a implementar en sus propios servidores las medidas de seguridad de carácter administrativo, físico y técnico aplicables, para proteger los archivos de respaldo transferidos por EL RESPONSABLE. Estas medidas deberán ser proporcionales al riesgo del tratamiento y conformes al *Documento de Seguridad* del sistema.

Dichas medidas deberán incluir, como mínimo: control de acceso al repositorio de respaldos, restricción de privilegios al personal autorizado, registro de accesos y operaciones relevantes, protección contra pérdida, alteración, daño, acceso no autorizado o destrucción accidental, mecanismos de verificación de integridad y procedimientos de atención ante incidentes.

EL RESPONSABLE, directamente o por conducto del área institucional competente en materia de transparencia y protección de datos personales (CUTAI), se reserva el derecho de verificación mediante la solicitud de evidencias, reportes técnicos o verificaciones documentales para acreditar el cumplimiento de las medidas acordadas.

### SEXTA. Confidencialidad

El personal de LA PERSONA ENCARGADA que intervenga en la administración de la infraestructura deberá guardar estricta confidencialidad respecto de la existencia, ubicación, estructura, contenido y características técnicas de los respaldos. En cumplimiento de los artículos 52 y 53 de la LGPDPPSO y de los artículos correlativos de la Ley 251 relativos a la relación entre responsable y persona encargada.

La obligación de confidencialidad subsistirá aun después de concluida la relación administrativa, laboral o institucional.

### SÉPTIMA. Notificación de incidentes de seguridad e indisponibilidad

En cumplimiento de los artículos 52 y 53 de la LGPDPPSO y de los artículos correlativos de la Ley 251 relativos a la relación entre responsable y persona encargada, en caso de incidente, vulneración, acceso no autorizado, pérdida, alteración, destrucción o indisponibilidad de los respaldos, LA PERSONA ENCARGADA deberá informar a EL RESPONSABLE de manera inmediata y sin dilación injustificada.

La notificación incluirá el tipo de incidente, fecha probable, sistemas afectados y medidas de contención. EL RESPONSABLE determinará si procede la notificación a titulares y autoridades competentes.

En caso de indisponibilidad temporal del repositorio secundario, LA PERSONA ENCARGADA deberá informar a EL RESPONSABLE el periodo estimado de afectación. EL RESPONSABLE documentará la interrupción y aplicará el procedimiento alterno de conservación local o diferida previsto en el *Documento de Seguridad*.

### OCTAVA. Prohibición de subcontratación, alojamiento externo y comunicación no autorizada

LA PERSONA ENCARGADA no podrá subcontratar, replicar, alojar, comunicar, remitir o conservar los respaldos en infraestructura de terceros, proveedores externos o servicios de nube pública, salvo autorización previa, expresa y por escrito de EL RESPONSABLE, validada por el área jurídica o administrativa competente.

### NOVENA. Conservación, devolución y supresión

En cumplimiento de los artículos 52 y 53 de la LGPDPPSO y de los artículos correlativos de la Ley 251 relativos a la relación entre responsable y persona encargada, una vez concluido el plazo de conservación, o cuando EL RESPONSABLE lo instruya por escrito, LA PERSONA ENCARGADA deberá proceder a la devolución o supresión segura de los respaldos, conforme al Anexo II del presente instrumento.

La supresión deberá realizarse mediante mecanismos que impidan su recuperación no autorizada y documentarse obligatoriamente mediante evidencia técnica que contenga como mínimo:
- Fecha de eliminación.
- Nombre del archivo eliminado.
- Hash criptográfico del archivo.
- Nombre del responsable que ejecutó la eliminación.
- Medio o comando utilizado.
- Confirmación expresa de que no quedan copias operativas.
- Firma o validación del responsable técnico.

### DÉCIMA. Responsabilidad de las partes

EL RESPONSABLE conserva la responsabilidad sobre la licitud del tratamiento, la evaluación de riesgos y la determinación de medidas aplicables al sistema.

LA PERSONA ENCARGADA será responsable de cumplir las instrucciones documentadas y de proteger los respaldos bajo su custodia conforme a las medidas de seguridad acordadas. El presente convenio no implica transferencia de titularidad sobre los datos personales.

### DÉCIMO PRIMERA. Cláusula de modificación

Cualquier modificación a los aspectos técnicos u operativos establecidos en los anexos podrá realizarse mediante acuerdo documentado entre los responsables técnicos designados. Cuando la modificación implique cambios en plazos de conservación, medidas de seguridad, responsables institucionales, ubicación de almacenamiento, subcontratación o alcance del tratamiento, deberá contar además con validación del área jurídica o administrativa competente y no bastará el mero acuerdo técnico.

### DÉCIMO SEGUNDA. Pruebas periódicas de recuperación

EL RESPONSABLE deberá realizar, al menos una vez cada seis meses, una prueba documentada de recuperación de respaldos conforme al Anexo III, con el objeto de verificar la integridad, disponibilidad y utilidad de los archivos custodiados por LA PERSONA ENCARGADA.

### DÉCIMO TERCERA. Vigencia

El presente instrumento entrará en vigor a partir de su firma y permanecerá vigente mientras LA PERSONA ENCARGADA conserve respaldos del sistema referido.

La terminación del presente instrumento no extinguirá las obligaciones de confidencialidad, seguridad, documentación, devolución, supresión segura, conservación de evidencias y atención de auditorías relacionadas con los respaldos custodiados durante su vigencia.

---

## LUGAR Y FECHA DE FIRMA

Firmado en la ciudad de ________________________, Veracruz, a los ____ días del mes de _____________ de 202__.

## FIRMAS DE CONFORMIDAD

Por EL RESPONSABLE:

---
**Nombre:** ___________________________________  
**Cargo:** Director/a de la USBI – Región Coatzacoalcos-Minatitlán  
**Representación:** En ejercicio de facultades institucionales delegadas por la Universidad Veracruzana.  

Por LA PERSONA ENCARGADA:

---
**Nombre:** ___________________________________  
**Cargo:** Titular de la Dirección General de Tecnologías de la Información (DGTI-UV)  
**Representación:** En ejercicio de facultades institucionales operativas de la Universidad Veracruzana.  

---

## ANEXOS INTEGRANTES DEL INSTRUMENTO

### Anexo I: Especificaciones Técnicas y Operativas

| Parámetro | Especificación a Implementar |
|---|---|
| **Servidor Origen** | _(IP / Hostname de la USBI)_ |
| **Servidor Destino** | _(IP / Hostname de la DGTI-UV)_ |
| **Ruta de almacenamiento** | _(Directorio absoluto en destino)_ |
| **Método de transferencia** | Rsync sobre túnel SSH |
| **Usuario técnico autorizado** | _(Usuario SSH dedicado y restringido)_ |
| **Método de autenticación** | Llave pública RSA/Ed25519 (Sin contraseña) |
| **Puerto de conexión** | _(Puerto SSH asignado)_ |
| **Periodicidad del respaldo** | Diario (programado vía cron) |
| **Límite de almacenamiento asignado** | _(Cuota en GB acordada con DGTI-UV)_ |
| **Nomenclatura de archivos** | `usbi_backup_YYYYMMDD_HHMM.sql.zst.enc` |
| **Algoritmo de compresión** | `zstd` |
| **Algoritmo de cifrado** | Cifrado asimétrico / simétrico definido en EIPDP |
| **Verificación de integridad** | Generación de archivo hash (SHA-256) acompañante |
| **Responsable técnico (USBI)** | _(Nombre y cargo)_ |
| **Responsable técnico (DGTI-UV)** | _(Nombre y cargo)_ |

**Nota de seguridad:** El presente anexo no deberá contener contraseñas, llaves privadas, secretos criptográficos, tokens, frases de recuperación ni credenciales reutilizables. Dichos elementos deberán gestionarse exclusivamente mediante los mecanismos seguros definidos en el Documento de Seguridad.

### Anexo II: Política de Retención y Supresión

| Categoría de Respaldo | Plazo de Retención | Acción Posterior |
|---|---|---|
| **Respaldos diarios** | Conservar 7 días | Sustitución cíclica automática o supresión segura manual |
| **Respaldos semanales** | Conservar 4 semanas | Eliminación automática documentada |
| **Respaldos mensuales** | Conservar 3 meses | Eliminación automática documentada |

_Nota: Los plazos podrán extenderse por excepción únicamente en caso de incidente activo, auditoría en curso o requerimiento institucional de autoridad competente._

### Anexo III: Procedimiento de Restauración y Pruebas

Este procedimiento rige los casos en los que la USBI requiera recuperar la información custodiada por la DGTI-UV:

1. **Facultad de solicitud:** Solo el Responsable Técnico de la USBI o el Director de la USBI pueden solicitar una restauración manual.
2. **Casos de procedencia:** Corrupción de base de datos local, falla crítica de hardware en el servidor origen (USBI), indisponibilidad del servicio, o ejecución de la prueba semestral de recuperación.
3. **Mecanismo de solicitud:** Se enviará correo electrónico institucional o ticket de soporte al Responsable Técnico de la DGTI-UV indicando el nombre del archivo específico a recuperar.
4. **Recuperación:** La USBI descargará el archivo vía Rsync/SCP utilizando las mismas credenciales de envío.
5. **Descifrado:** El archivo cifrado será procesado localmente en la USBI. La DGTI-UV no interviene en este paso por carecer de las llaves.
6. **Bitácora:** Toda solicitud de restauración o prueba de recuperación deberá quedar documentada en la bitácora de incidentes y requerimientos de la USBI. La bitácora de restauración deberá contener, como mínimo: fecha de solicitud, persona solicitante, archivo requerido, hash del archivo recuperado, persona que atendió la solicitud, resultado de descarga, resultado de verificación de integridad, resultado de descifrado, resultado de restauración o prueba, observaciones y validación del Responsable Técnico de la USBI.