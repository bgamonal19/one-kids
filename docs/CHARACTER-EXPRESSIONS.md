# Compañeros y expresiones de ONE KIDS

## Colección aprobada

Seis personajes: `bear`, `inventor`, `polar`, `turtle`, `penguin`, `tutorbot`.
Cada lámina original de 1536 × 1024 contiene quince poses numeradas.
Las fuentes aprobadas se guardan sin cambios en `assets/characters/expressions/sheets/`.
Las versiones con alfa real se guardan en
`assets/characters/expressions/transparent/`; no tienen papel, etiquetas ni
sombras de suelo. Conservan el orden 5×3 de los quince gestos.
`lib/expressions.ts` selecciona los dibujos desde estas versiones transparentes. Cada personaje carga una sola imagen cacheable;
no se generan ni descargan imágenes al cambiar de expresión.

Son ilustraciones con acabado 3D y animaciones del conjunto (desplazamiento,
giro y escala). Las caras y poses están dibujadas en las láminas; no son
mallas con rig facial, animaciones esqueléticas ni sincronización de labios.
Los GLB de `assets/characters/models/` son prototipos geométricos independientes
producidos por los scripts offline, y no sustituyen estas expresiones aprobadas.

## Gestos y acciones

1. `hello`: saludo inicial.
2. `listen`: al escribir o enfocar el campo del tutor.
3. `think`: solicitud de ayuda pendiente.
4. `explain`: respuesta recibida.
5. `curious`: reto o nueva ronda.
6. `focused`: foto preparada o tarea agregada.
7. `hint`: respuesta solicitada con «Una pista».
8. `retry`: fallo de comunicación o respuesta incorrecta en un juego.
9. `encourage`: «Tú puedes» y acompañamiento de tareas.
10. `correct`: acierto comprobado por el juego o tarea marcada completa.
11. `celebrate`: checklist completada.
12. `surprise`: disponible en la vista previa.
13. `confused`: disponible en la vista previa.
14. `rest`: disponible en la vista previa, sin movimiento continuo.
15. `bye`: disponible en la vista previa.

La interfaz no interpreta por palabras sueltas si el niño acertó: el juego
valida la respuesta y la checklist refleja lo marcado por el usuario.
El tutor no recibe permisos adicionales ni valida automáticamente las tareas.

## Preferencias y accesibilidad

El perfil guarda el ID en el almacenamiento existente. Los IDs antiguos siguen
siendo válidos; entradas desconocidas vuelven a Kiko. Los perfiles nuevos y la
demo empiezan con el oso explorador. El perfil permite probar los quince gestos
antes de guardar. Solo la vista previa activa se anima; las miniaturas son
estáticas. La flotación usa un ciclo sinusoidal continuo de 5,4 segundos,
con balanceo lateral leve, respiración y sombra independiente que cambia con
la altura. Cambiar de expresión no reinicia el ciclo. Los gestos de pensar y
celebrar se introducen con un resorte amortiguado; el descanso queda inmóvil. Se respeta la preferencia de movimiento reducido del dispositivo.
Las reacciones temporales se limpian al abandonar la pantalla.

## Verificación

- `node scripts/check-character-assets.cjs`: valida las 90 posiciones contra
  las dimensiones de los PNG reales, límites y unicidad.
- `python scripts/check-character-transparency.py`: verifica alfa, fondo
  transparente y presencia de las noventa poses.
- `npx tsc --noEmit` y `npx expo export -p web`.
- Revisión ESLint de los archivos modificados.
- Navegador: 90 cambios de expresión, elección, guardado, recarga, tutor,
  botones de pista y ánimo, tareas y juegos.

El lint general conserva tres problemas anteriores en onboarding PIN,
`EditScreenInfo` y `useClientOnlyValue.web`; están fuera de este cambio.

## Siguientes etapas

1. Conectar y verificar el tutor real mediante el backend de Supabase/OpenAI
   ya previsto; la demo sin claves continúa en modo local.
2. Preparar, si se desea, voz y sincronización de labios con consentimiento
   parental y controles de audio.
3. Si se requiere 3D interactivo con cámara giratoria y articulaciones,
   producir mallas definitivas con rig facial/corporal a partir del arte aprobado.
