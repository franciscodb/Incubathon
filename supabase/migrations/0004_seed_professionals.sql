-- =====================================================================
-- Buró de Cumplimiento Regulatorio
-- Migración 0004: Seed de profesionales verificados del marketplace
-- =====================================================================
-- user_id se deja null: son perfiles semilla de demostración. Cuando un
-- profesional real se registre, se creará con su propio user_id.

insert into public.professionals
    (id, user_id, nombre, profesion, especialidades, procedures_codes, cedula, bio, ciudad, alcaldias, telefono, email, sitio_web, verified, rating, reviews_count)
values
(
 '11111111-1111-1111-1111-111111111111', null,
 'Mariana Ortega Ruiz', 'Tercero Acreditado en Protección Civil',
 array['Protección Civil','Programa Interno','Simulacros'],
 array['PROTECCION_CIVIL_PIPC','VBSO'],
 'TA-CDMX-0912',
 'Tercero acreditado ante la SGIRPC con 8 años elaborando Programas Internos de Protección Civil para restaurantes y bares en CDMX.',
 'Ciudad de México', array['Cuauhtémoc','Miguel Hidalgo','Benito Juárez'],
 '55-1234-5678', 'mariana.ortega@example.com', 'https://pcprofesional.example.com',
 true, 4.9, 37
),
(
 '22222222-2222-2222-2222-222222222222', null,
 'Ing. Carlos Méndez Salas', 'Unidad de Verificación de Gas L.P.',
 array['Gas L.P.','Instalaciones','NOM-004-SEDG'],
 array['DICTAMEN_GAS','VBSO'],
 'UV-GAS-2205',
 'Unidad de verificación acreditada para instalaciones de gas L.P. Dictámenes para cocinas industriales y calentadores.',
 'Ciudad de México', array['Iztapalapa','Coyoacán','Tlalpan'],
 '55-2345-6789', 'carlos.mendez@example.com', null,
 true, 4.7, 21
),
(
 '33333333-3333-3333-3333-333333333333', null,
 'Arq. Daniela Fuentes', 'Directora Responsable de Obra (DRO)',
 array['DRO','Uso de Suelo','Visto Bueno de Seguridad','Anuncios'],
 array['VBSO','USO_SUELO','LICENCIA_ANUNCIOS'],
 'DRO-4471',
 'DRO registrada. Acompaño la obtención del Visto Bueno de Seguridad y Operación y trámites de uso de suelo y anuncios.',
 'Ciudad de México', array['Cuauhtémoc','Álvaro Obregón','Miguel Hidalgo'],
 '55-3456-7890', 'daniela.fuentes@example.com', 'https://drofuentes.example.com',
 true, 4.8, 44
),
(
 '44444444-4444-4444-4444-444444444444', null,
 'Lic. Roberto Aguilar', 'Abogado Corporativo y Regulatorio',
 array['Licencias','Alcohol','Impacto Vecinal','Amparos'],
 array['PERMISO_ALCOHOL','AVISO_APERTURA','USO_SUELO'],
 'CED-8891023',
 'Abogado especializado en licencias de funcionamiento, permisos de alcohol e impacto vecinal para el sector restaurantero.',
 'Ciudad de México', array['Benito Juárez','Cuauhtémoc','Coyoacán'],
 '55-4567-8901', 'roberto.aguilar@example.com', null,
 true, 4.6, 29
),
(
 '55555555-5555-5555-5555-555555555555', null,
 'Laboratorio Acústica Integral S.C.', 'Laboratorio de Ensayo Acreditado',
 array['Ruido','Estudios Acústicos','NADF-005'],
 array['ESTUDIO_RUIDO'],
 'LAB-EMA-0771',
 'Laboratorio acreditado por la EMA para estudios de ruido perimetral conforme a la NADF-005-AMBT-2013.',
 'Ciudad de México', array['Cuauhtémoc','Miguel Hidalgo','Venustiano Carranza'],
 '55-5678-9012', 'contacto@acusticaintegral.example.com', 'https://acusticaintegral.example.com',
 true, 4.5, 15
),
(
 '66666666-6666-6666-6666-666666666666', null,
 'GreenCiclo Gestión Ambiental', 'Gestor de Residuos Autorizado',
 array['Residuos','Aceites y Grasas','SEDEMA','SACMEX'],
 array['PLAN_MANEJO_RESIDUOS','SACMEX_DESCARGAS'],
 'GA-SEDEMA-3320',
 'Gestor autorizado para el plan de manejo de residuos, recolección de aceites y asesoría en descargas SACMEX.',
 'Ciudad de México', array['Iztacalco','Gustavo A. Madero','Azcapotzalco'],
 '55-6789-0123', 'hola@greenciclo.example.com', null,
 false, 4.2, 8
)
on conflict (id) do nothing;
