import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-6 md:p-12" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-4xl mx-auto space-y-8 bg-[--color-card] p-8 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
        <header className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border)' }}>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>AVISO DE PRIVACIDAD INTEGRAL</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>Plataforma Educativa y Motor de Minijuegos - USBI<br/>Última actualización: 08 de julio de 2026.</p>
        </header>

        <section className="space-y-4">
          <p>
            La <strong>Universidad Veracruzana</strong>, con domicilio en Lomas del Estadio S/N, colonia Zona Universitaria, código postal 91000 en Xalapa, Veracruz, a través de la Unidad de Servicios Bibliotecarios y de Información (USBI) región Coatzacoalcos-Minatitlán, es la responsable del tratamiento y máxima protección de los datos personales que usted nos proporcione, los cuales serán resguardados en nuestra infraestructura de servidores locales (<em>On-Premise</em>) conforme a lo dispuesto por la <strong>Ley Número 251 de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Veracruz de Ignacio de la Llave</strong> y demás normatividad aplicable, bajo la supervisión interna de la CUTAI.
          </p>

          <h2 className="text-xl font-bold mt-6">1. Datos Personales Recabados y Principio de Minimización</h2>
          <p>Para cumplir con los fines de esta plataforma interactiva y respetando el Principio de Proporcionalidad para no saturar nuestra infraestructura local, recabaremos <strong>únicamente</strong> los siguientes datos:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Datos Identificativos:</strong> Nombre completo.</li>
            <li><strong>Datos Electrónicos:</strong> Correo electrónico y/o número de teléfono.</li>
            <li><strong>Datos de Menores de Edad:</strong> En caso de que el usuario declare ser menor de 18 años, el sistema recabará el nombre completo y correo electrónico del padre, madre o tutor legal. Este tratamiento se realiza bajo el principio del interés superior de la niñez y respeta el <strong>Derecho a la Intimidad establecido en los Artículos 76 y 77 de la Ley General de los Derechos de Niñas, Niños y Adolescentes (LGDNNA)</strong>, en estricto apego al consentimiento que dicta la <strong>Ley Número 251</strong>. Para garantizar el principio de minimización y no saturar nuestra capacidad de almacenamiento local de 20 GB, el sistema no almacena fechas de nacimiento exactas.</li>
            <li><strong>Se informa expresamente que esta plataforma NO recaba datos personales sensibles</strong> (como estado de salud, origen étnico, creencias religiosas o preferencia sexual).</li>
          </ul>

          <h2 className="text-xl font-bold mt-6">2. Medidas de Seguridad y Soberanía de Datos (Privacidad por Diseño)</h2>
          <p>Para garantizar la confidencialidad, la plataforma opera bajo una estricta arquitectura <em>On-Premise</em> local. Su progreso y los datos ingresados se almacenan temporalmente en su dispositivo mediante una base de datos encriptada. Todas las operaciones de sincronización de la plataforma hacia el servidor institucional se autentican mediante firmas criptográficas (HMAC-SHA256). Esta infraestructura aporta controles técnicos de integridad para demostrar trazabilidad y no repudio del mensaje de datos, asegurando que su información jamás se almacene en nubes públicas de terceros no autorizados o en texto plano.</p>
          
          <h3 className="text-lg font-semibold mt-4">Protocolo de Cancelación Remota (ARCO) y Límite de Responsabilidad Offline:</h3>
          <p>En caso de que el titular o su tutor ejerzan el derecho de Cancelación, el servidor institucional inyectará en la primera respuesta de sincronización (al reconectar el dispositivo) una orden de <em>"borrado forzoso"</em> (flag de wipe_local_data). Esto obligará a la aplicación a eliminar de forma irrecuperable la base de datos SQLite encriptada del dispositivo local. En el supuesto de que el dispositivo del usuario jamás vuelva a conectarse a internet para recibir dicha orden, la Universidad Veracruzana dará por cumplida su obligación legal de supresión al purgar definitivamente los datos del servidor local institucional (PostgreSQL), quedando exenta de responsabilidad sobre la existencia residual del archivo local cifrado en el dispositivo físico del usuario, al cual la Institución no tiene acceso ni control técnico.</p>
          
          <h3 className="text-lg font-semibold mt-4">Protocolo de Notificación de Vulneraciones de Seguridad:</h3>
          <p>En el supuesto de que se presente una vulneración a la seguridad de nuestra infraestructura local (tal como el acceso, alteración, pérdida o destrucción no autorizada de la base de datos PostgreSQL/SQLite), la Universidad Veracruzana actuará en estricto apego a la <strong>Ley Número 251</strong>. Se notificará sin dilación alguna a los titulares afectados, a la CUTAI y a las autoridades garantes. Dicha notificación informará de manera clara: la naturaleza del incidente, los datos personales comprometidos, las acciones correctivas implementadas de forma inmediata y las recomendaciones pertinentes para que el titular proteja sus intereses. Asimismo, la Institución registrará cualquier incidencia en una bitácora de vulneraciones para fines de auditoría y mejora continua de la seguridad.</p>

          <h2 className="text-xl font-bold mt-6">3. Finalidades del Tratamiento</h2>
          <p>Sus datos personales serán utilizados de forma exclusiva para:</p>
          <ol className="list-alpha pl-6 space-y-1" style={{ listStyleType: 'lower-alpha' }}>
            <li>Gestionar su registro, autenticación y acceso al sistema de minijuegos educativos.</li>
            <li>Sincronizar, respaldar y auditar de forma segura su progreso, experiencia y niveles superados entre dispositivos.</li>
            <li>Validar el consentimiento legal del tutor, en el caso de menores de edad.</li>
          </ol>
          <p>Adicionalmente, se realizarán tratamientos para finalidades administrativas, instrumentales y de cumplimiento normativo, como facilitar la rendición de cuentas, auditoría interna de recursos y habilitar el ejercicio de derechos ARCO.</p>

          <h2 className="text-xl font-bold mt-6">4. Remisiones y Transferencias de Datos Personales</h2>
          <p>Le informamos que sus datos personales no serán compartidos, vendidos ni transferidos a ninguna empresa, entidad privada o tercero. Únicamente se realizarán remisiones internas de respaldos cifrados a otras dependencias de la red universitaria bajo convenio de encargo de tratamiento, y transferencias de información cuando deriven de requerimientos oficiales de una autoridad judicial o administrativa competente, que se encuentren debidamente fundados y motivados conforme la ley número 251.</p>

          <h2 className="text-xl font-bold mt-6">5. Ejercicio de los Derechos ARCO</h2>
          <p>Usted, o su tutor legal, tiene derecho a conocer qué datos personales tenemos suyos (<strong>A</strong>cceso); solicitar la corrección de su información si está desactualizada o es inexacta (<strong>R</strong>ectificación); que eliminemos su cuenta y datos de nuestros registros institucionales (<strong>C</strong>ancelación); así como a <strong>O</strong>ponerse al uso de sus datos para fines específicos. El ejercicio de estos derechos es totalmente gratuito. Para ello, deberá presentar una solicitud ante la <strong>Coordinación Universitaria de Transparencia, Acceso a la Información y Protección de Datos Personales (CUTAI)</strong> de la Universidad Veracruzana.</p>
          
          <p>De conformidad con la <strong>Ley Número 251</strong>, la solicitud para ejercer sus derechos ARCO no podrá imponer mayores requisitos que los siguientes:</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>El nombre del titular y su domicilio o cualquier otro medio para recibir notificaciones;</li>
            <li>Los documentos que acrediten la identidad del titular, y en su caso, la personalidad e identidad de su representante;</li>
            <li>De ser posible, el área responsable que trata los datos personales;</li>
            <li>La descripción clara y precisa de los datos personales respecto de los que se busca ejercer alguno de los derechos ARCO, salvo que se trate del derecho de acceso;</li>
            <li>La descripción del derecho ARCO que se pretende ejercer, o bien, lo que solicita el titular; y</li>
            <li>Cualquier otro elemento o documento que facilite la localización de los datos personales.</li>
          </ol>
          
          <h3 className="text-lg font-semibold mt-4">Datos de contacto de la CUTAI:</h3>
          <ul className="list-none pl-4 space-y-1">
            <li><strong>Domicilio:</strong> Calle Guillermo Prieto número 103, colonia Dos de Abril, CP 91030, Xalapa, Veracruz.</li>
            <li><strong>Teléfono:</strong> (228) 8 42 1700 ext. 10504 o (228) 8 41 59 20.</li>
            <li><strong>Correo electrónico institucional:</strong> datospersonales@uv.mx</li>
            <li><strong>Plataforma Electrónica:</strong> También puede realizar su solicitud a través de la Plataforma Nacional de Transparencia.</li>
          </ul>

          <h2 className="text-xl font-bold mt-6">6. Cambios al Aviso de Privacidad</h2>
          <p>La Universidad Veracruzana se reserva el derecho de efectuar modificaciones o actualizaciones a este aviso de privacidad. Cualquier cambio será notificado a los usuarios mediante un anuncio visible dentro de la aplicación de escritorio y a través de la página web oficial de transparencia de la Universidad: <a href="https://www.uv.mx/transparencia/infpublica/avisos-privacidad/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }} className="underline">https://www.uv.mx/transparencia/infpublica/avisos-privacidad/</a></p>
        </section>

        <hr className="my-8" style={{ borderColor: 'var(--color-border)' }} />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>AVISO DE PRIVACIDAD SIMPLIFICADO</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>Última actualización: 08 de julio de 2026</p>
          <p>
            La Universidad Veracruzana, a través de la Unidad de Servicios Bibliotecarios y de Información (USBI) región Coatzacoalcos-Minatitlán, es la responsable del tratamiento de los datos personales que nos proporcione. Sus datos (nombre, correo electrónico, teléfono y, en caso de ser menor de edad, el nombre y correo de su tutor legal) serán utilizados exclusivamente para: crear su cuenta de usuario, sincronizar su progreso en los minijuegos mediante nuestra infraestructura de servidores locales (<em>On-Premise</em>) y validar el consentimiento parental. Le informamos que no recabamos datos personales sensibles y que sus datos no serán transferidos a ningún tercero, salvo por requerimientos de una autoridad competente debidamente fundados y motivados. Usted o su tutor podrán ejercer sus derechos ARCO ante la Coordinación Universitaria de Transparencia (CUTAI). Para mayor información sobre el tratamiento de sus datos, las medidas de encriptación local aplicadas y cómo ejercer sus derechos, puede consultar nuestro Aviso de Privacidad Integral en la sección 'Privacidad' de esta aplicación o en: <a href="https://www.uv.mx/coatzacoalcos/usbi/privacidad" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }} className="underline">https://www.uv.mx/coatzacoalcos/usbi/privacidad</a>.
          </p>
        </section>

        <div className="pt-8 text-center">
          <Link to="/register" className="inline-block px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            Volver al registro
          </Link>
        </div>
      </div>
    </main>
  );
}
