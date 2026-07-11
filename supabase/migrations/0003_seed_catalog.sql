-- =====================================================================
-- Buró de Cumplimiento Regulatorio
-- Migración 0003: Seed del catálogo de trámites CDMX (Alimentos y Bebidas)
-- =====================================================================
-- Fuente: shared/catalog.json. Idempotente (upsert por code).

insert into public.procedures_catalog
    (code, name, authority, category, criticality, vigencia_meses, estimated_cost, estimated_time, official_url, description, why, steps)
values
(
 'RFC_SAT',
 'Inscripción en el RFC (SAT)',
 'Servicio de Administración Tributaria (SAT)',
 'fiscal', 'alta', null, 'Gratuito', '1 día (cita en línea)',
 'https://www.sat.gob.mx/tramites/28753/inscribete-en-el-rfc-como-persona-fisica',
 'Registro fiscal obligatorio para poder facturar, emitir comprobantes y operar formalmente el establecimiento.',
 'Sin RFC no puedes emitir facturas, contratar personal formalmente ni acceder a otros permisos que lo solicitan como requisito previo.',
 '[{"title":"Reúne tus documentos","detail":"CURP, comprobante de domicilio fiscal (no mayor a 4 meses) e identificación oficial vigente."},{"title":"Agenda tu cita","detail":"Entra a citas.sat.gob.mx y selecciona Inscripción de personas físicas o morales según tu caso."},{"title":"Acude a la oficina del SAT","detail":"Lleva tus documentos originales; te entregarán tu Constancia de Situación Fiscal y contraseña."},{"title":"Activa e.firma","detail":"Solicita tu e.firma (firma electrónica) para trámites en línea posteriores."}]'::jsonb
),
(
 'AVISO_APERTURA',
 'Aviso de Apertura / Declaración de Apertura de Establecimiento Mercantil',
 'SEDECO CDMX (SIAPEM)',
 'operacion', 'alta', null, 'Gratuito', 'Inmediato (en línea)',
 'https://siapem.cdmx.gob.mx/',
 'Aviso obligatorio ante el gobierno de la CDMX para operar un establecimiento mercantil de bajo impacto (la mayoría de restaurantes y cafeterías sin venta de alcohol).',
 'Es el documento que acredita que tu negocio está dado de alta legalmente ante la Ciudad. El INVEA lo verifica en inspecciones y su ausencia puede derivar en clausura.',
 '[{"title":"Verifica el uso de suelo","detail":"Confirma que el giro de alimentos y bebidas está permitido en tu ubicación."},{"title":"Entra al SIAPEM","detail":"Ingresa con tu Llave CDMX a siapem.cdmx.gob.mx y selecciona Declaración de Apertura."},{"title":"Captura los datos del establecimiento","detail":"Giro, superficie, aforo, ubicación y datos del titular."},{"title":"Descarga tu acuse","detail":"El sistema genera un acuse con folio; imprímelo y tenlo visible en el establecimiento."}]'::jsonb
),
(
 'USO_SUELO',
 'Certificado Único de Zonificación de Uso de Suelo',
 'SEDUVI CDMX',
 'inmueble', 'alta', null, '$300 - $1,200 MXN aprox.', '5 a 10 días hábiles',
 'https://www.seduvi.cdmx.gob.mx/',
 'Documento que certifica los usos de suelo permitidos en el predio donde operará el negocio. Determina si tu giro es viable en esa ubicación.',
 'Operar un giro no permitido en la zonificación es causa directa de negativa de permisos y de clausura. Es requisito previo para casi todos los demás trámites.',
 '[{"title":"Identifica tu predio","detail":"Ten a la mano la cuenta predial y la dirección exacta con número oficial."},{"title":"Solicita el certificado en línea","detail":"En el portal de SEDUVI selecciona Certificado Único de Zonificación de Uso de Suelo."},{"title":"Paga los derechos","detail":"Genera la línea de captura y paga en el portal de Finanzas CDMX."},{"title":"Descarga el certificado","detail":"Revisa que el giro de alimentos y bebidas aparezca como permitido antes de firmar contratos."}]'::jsonb
),
(
 'AVISO_SANITARIO_COFEPRIS',
 'Aviso de Funcionamiento Sanitario (COFEPRIS)',
 'COFEPRIS',
 'sanitario', 'alta', null, 'Gratuito', 'Inmediato (en línea)',
 'https://www.gob.mx/cofepris',
 'Aviso obligatorio para establecimientos que procesan, preparan o expenden alimentos y bebidas. Acredita el cumplimiento de la normativa sanitaria federal.',
 'Todo establecimiento que maneja alimentos debe presentarlo. Su ausencia genera riesgos sanitarios y sanciones de COFEPRIS.',
 '[{"title":"Prepara la información del giro","detail":"Tipo de alimentos que manejas, procesos y datos del responsable sanitario."},{"title":"Entra al portal de COFEPRIS","detail":"Selecciona Aviso de Funcionamiento y de Responsable Sanitario."},{"title":"Llena y envía el aviso","detail":"Completa el formato electrónico; no requiere pago para el giro de A&B."},{"title":"Resguarda tu acuse","detail":"Guarda el acuse con folio; deberás mostrarlo en verificaciones sanitarias."}]'::jsonb
),
(
 'PROTECCION_CIVIL_PIPC',
 'Programa Interno de Protección Civil (PIPC)',
 'Secretaría de Gestión Integral de Riesgos y Protección Civil (SGIRPC)',
 'proteccion_civil', 'alta', 12, '$8,000 - $25,000 MXN (tercero acreditado)', '3 a 6 semanas',
 'https://www.proteccioncivil.cdmx.gob.mx/',
 'Documento técnico que establece las acciones de prevención, auxilio y recuperación ante emergencias. Debe elaborarlo un Tercero Acreditado registrado.',
 'Es uno de los trámites que más clausuras genera por su ausencia. Obligatorio para establecimientos con afluencia de público, y crítico si vendes alcohol o usas gas.',
 '[{"title":"Contrata un Tercero Acreditado","detail":"Solo un tercero acreditado y registrado ante la SGIRPC puede elaborar y firmar el PIPC."},{"title":"Diagnóstico de riesgos","detail":"El tercero realiza el análisis de riesgos internos y externos del inmueble."},{"title":"Elaboración del programa","detail":"Incluye planes de emergencia, señalización, extintores, brigadas y simulacros."},{"title":"Registro ante la SGIRPC","detail":"Se ingresa el programa para su registro; debe revalidarse anualmente."}]'::jsonb
),
(
 'VBSO',
 'Visto Bueno de Seguridad y Operación (VBSO)',
 'Alcaldía correspondiente / SGIRPC',
 'proteccion_civil', 'alta', 36, '$3,000 - $10,000 MXN', '2 a 4 semanas',
 'https://www.cdmx.gob.mx/',
 'Constancia que acredita que las instalaciones y equipos del establecimiento cumplen las condiciones de seguridad y operación exigidas por el Reglamento de Construcciones.',
 'Requerido para establecimientos de mediana y alta afluencia. Verifica instalaciones eléctricas, de gas, hidráulicas y de seguridad.',
 '[{"title":"Contrata un DRO o Corresponsable","detail":"Un Director Responsable de Obra evalúa que el inmueble cumpla el Reglamento de Construcciones."},{"title":"Revisión de instalaciones","detail":"Verificación de instalaciones eléctricas, hidráulicas, sanitarias y de gas."},{"title":"Integración del expediente","detail":"Planos, memorias de cálculo y responsiva del DRO."},{"title":"Ingreso ante la Alcaldía","detail":"Presenta el expediente; el VBSO debe renovarse periódicamente (usualmente cada 3 años)."}]'::jsonb
),
(
 'PERMISO_ALCOHOL',
 'Autorización para Venta de Bebidas Alcohólicas (Impacto Vecinal)',
 'SEDECO CDMX / Alcaldía',
 'operacion', 'alta', 12, 'Derechos según giro; puede superar $10,000 MXN', '10 a 20 días hábiles',
 'https://siapem.cdmx.gob.mx/',
 'Permiso para operar como establecimiento de impacto vecinal con venta de bebidas alcohólicas. Reclasifica al negocio como de impacto vecinal.',
 'Vender alcohol sin la autorización correspondiente es una de las infracciones más sancionadas por el INVEA, con multas altas y clausura.',
 '[{"title":"Confirma la viabilidad","detail":"El uso de suelo debe permitir venta de alcohol; hay restricciones por cercanía a escuelas."},{"title":"Presenta el Permiso de operación","detail":"En el SIAPEM selecciona el permiso de impacto vecinal con venta de alcohol."},{"title":"Cumple horarios y condiciones","detail":"Respeta los horarios autorizados y la exhibición del permiso."},{"title":"Revalida anualmente","detail":"El permiso requiere revalidación y pago de derechos cada año."}]'::jsonb
),
(
 'DICTAMEN_GAS',
 'Dictamen de Instalación de Gas L.P.',
 'Unidad de Verificación acreditada (Secretaría de Energía)',
 'seguridad', 'alta', 12, '$2,500 - $8,000 MXN', '1 a 3 semanas',
 'https://www.gob.mx/sener',
 'Dictamen que certifica que la instalación de gas L.P. cumple la NOM-004-SEDG-2004 y demás normas aplicables, emitido por una unidad de verificación acreditada.',
 'Las instalaciones de gas son causa frecuente de siniestros. El dictamen es exigido en verificaciones y por aseguradoras; su ausencia es riesgo grave.',
 '[{"title":"Contrata una Unidad de Verificación","detail":"Debe estar acreditada ante la EMA / Secretaría de Energía."},{"title":"Inspección física","detail":"Se revisan tanques, tuberías, reguladores, ventilación y detectores."},{"title":"Corrección de hallazgos","detail":"Si hay observaciones, corrige antes de la emisión del dictamen."},{"title":"Obtén el dictamen","detail":"Recibe el dictamen aprobatorio; renuévalo conforme a su vigencia."}]'::jsonb
),
(
 'AUTORIZACION_ENSERES',
 'Autorización de Enseres e Instalaciones en Vía Pública (Terraza)',
 'Alcaldía correspondiente',
 'operacion', 'media', 12, 'Derechos por m² ocupado (variable por alcaldía)', '10 a 15 días hábiles',
 'https://www.cdmx.gob.mx/',
 'Permiso para colocar mesas, sillas, sombrillas y enseres en la vía pública frente al establecimiento (terrazas y áreas al aire libre).',
 'Colocar enseres sin autorización genera retiro, multas y conflictos con la vía pública. Se renueva cada año.',
 '[{"title":"Croquis de ocupación","detail":"Elabora un croquis del área a ocupar con medidas y mobiliario."},{"title":"Solicita en tu Alcaldía","detail":"Presenta la solicitud en la ventanilla de la alcaldía correspondiente."},{"title":"Paga los derechos","detail":"El costo depende de los metros cuadrados ocupados."},{"title":"Renueva anualmente","detail":"La autorización de enseres se revalida cada año."}]'::jsonb
),
(
 'LICENCIA_ANUNCIOS',
 'Licencia / Permiso de Anuncios',
 'SEDUVI CDMX / Alcaldía',
 'inmueble', 'media', 12, 'Variable según tipo y dimensiones del anuncio', '10 a 20 días hábiles',
 'https://www.seduvi.cdmx.gob.mx/',
 'Autorización para la instalación de anuncios (adosados, autosoportados, luminosos) en la fachada o inmueble del establecimiento.',
 'Los anuncios sin licencia son sancionados por SEDUVI y las alcaldías. La Ley de Publicidad Exterior regula dimensiones y tipos permitidos.',
 '[{"title":"Define el tipo de anuncio","detail":"Adosado, autosoportado, de nicho, etc. Cada tipo tiene requisitos distintos."},{"title":"Verifica restricciones","detail":"Revisa dimensiones máximas y zonas restringidas según la Ley de Publicidad Exterior."},{"title":"Presenta la solicitud","detail":"Ante SEDUVI o la alcaldía, con planos y fotografías del anuncio."},{"title":"Obtén la licencia","detail":"Recibe el permiso y respeta su vigencia anual."}]'::jsonb
),
(
 'PLAN_MANEJO_RESIDUOS',
 'Plan de Manejo de Residuos Sólidos',
 'SEDEMA CDMX',
 'ambiental', 'media', 24, '$3,000 - $9,000 MXN', '2 a 4 semanas',
 'https://www.sedema.cdmx.gob.mx/',
 'Registro del plan de manejo de residuos sólidos (orgánicos, inorgánicos y de manejo especial como aceites y grasas) que genera el establecimiento.',
 'Los restaurantes generan residuos de manejo especial. Su manejo inadecuado genera sanciones ambientales y problemas de drenaje.',
 '[{"title":"Caracteriza tus residuos","detail":"Identifica los tipos y volúmenes de residuos que genera tu operación."},{"title":"Contrata gestores autorizados","detail":"Para aceites y grasas, usa empresas registradas de recolección."},{"title":"Elabora y registra el plan","detail":"Presenta el plan de manejo ante SEDEMA."},{"title":"Lleva bitácoras","detail":"Documenta la disposición de residuos; se revisa en verificaciones."}]'::jsonb
),
(
 'SACMEX_DESCARGAS',
 'Registro de Descargas de Aguas Residuales (SACMEX)',
 'Sistema de Aguas de la Ciudad de México (SACMEX)',
 'ambiental', 'media', null, 'Gratuito (registro); derechos de agua según consumo', '5 a 10 días hábiles',
 'https://www.sacmex.cdmx.gob.mx/',
 'Registro ante SACMEX de las descargas de aguas residuales y constancia de no adeudo de derechos por suministro de agua.',
 'Los establecimientos de A&B descargan grasas y aguas residuales. El registro y la trampa de grasas evitan sanciones y bloqueos de drenaje.',
 '[{"title":"Verifica tu toma de agua","detail":"Confirma que la cuenta de agua esté a nombre correcto y sin adeudos."},{"title":"Instala trampa de grasas","detail":"Obligatoria para cocinas; evita descargas que dañan el drenaje."},{"title":"Registra la descarga","detail":"Presenta el registro de descarga de aguas residuales ante SACMEX."},{"title":"Mantén el no adeudo","detail":"Paga los derechos de agua a tiempo para conservar la constancia de no adeudo."}]'::jsonb
),
(
 'ESTUDIO_RUIDO',
 'Constancia de Cumplimiento de Ruido (NADF-005)',
 'SEDEMA CDMX / PAOT',
 'ambiental', 'media', 12, '$4,000 - $12,000 MXN (estudio acústico)', '2 a 4 semanas',
 'https://www.sedema.cdmx.gob.mx/',
 'Estudio y constancia que acredita que los niveles de ruido emitidos cumplen la Norma Ambiental NADF-005-AMBT-2013.',
 'Los establecimientos con música o alta afluencia reciben quejas ciudadanas por ruido, una de las causas principales de reportes ante el INVEA y la PAOT.',
 '[{"title":"Realiza un estudio acústico","detail":"Un laboratorio acreditado mide los niveles de ruido en horarios de operación."},{"title":"Ajusta si es necesario","detail":"Instala aislamiento acústico si superas los límites permitidos."},{"title":"Obtén la constancia","detail":"Con las mediciones dentro de norma, tramita la constancia de cumplimiento."},{"title":"Renueva periódicamente","detail":"Revalida el estudio y atiende quejas vecinales de forma preventiva."}]'::jsonb
),
(
 'IMSS_PATRONAL',
 'Registro Patronal e Inscripción de Trabajadores (IMSS)',
 'Instituto Mexicano del Seguro Social (IMSS)',
 'laboral', 'alta', null, 'Gratuito (registro); cuotas mensuales', '1 a 5 días hábiles',
 'https://www.imss.gob.mx/patrones',
 'Alta como patrón ante el IMSS e inscripción de los trabajadores al seguro social. Obligatorio desde el primer empleado.',
 'No asegurar a los trabajadores genera multas del IMSS, responsabilidad por riesgos de trabajo y demandas laborales.',
 '[{"title":"Obtén tu registro patronal","detail":"Con e.firma, tramita el alta patronal en el portal del IMSS (IDSE)."},{"title":"Determina tu prima de riesgo","detail":"El giro de A&B tiene una clase de riesgo específica que define tus cuotas."},{"title":"Da de alta a tus trabajadores","detail":"Inscribe a cada empleado con su NSS dentro de los plazos legales."},{"title":"Paga cuotas mensuales","detail":"Cubre las cuotas obrero-patronales cada mes mediante el SUA."}]'::jsonb
)
on conflict (code) do update set
    name           = excluded.name,
    authority      = excluded.authority,
    category       = excluded.category,
    criticality    = excluded.criticality,
    vigencia_meses = excluded.vigencia_meses,
    estimated_cost = excluded.estimated_cost,
    estimated_time = excluded.estimated_time,
    official_url   = excluded.official_url,
    description    = excluded.description,
    why            = excluded.why,
    steps          = excluded.steps;
