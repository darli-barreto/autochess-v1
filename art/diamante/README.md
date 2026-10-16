# Arena Diamante — patio de autochess

- `Arena-Diamante-Autochess.blend`: proyecto editable. Incluye el modelo original en una colección oculta, el patio adaptado y una cámara de presentación.
- `preview.png`: render de Blender del diseño adaptado.
- `in-game-polished.png`: captura real de la app con la cuadrícula oculta.
- `in-game-placement.png`: comprobación de las guías durante colocación.
- `in-game-after-cancel.png`: comprobación de que las guías desaparecen al cancelar.
- `original.png`: vista de referencia del modelo recibido.
- `../../public/Arenas/Arena-Diamante-Autochess.glb`: modelo usado por el juego.

El GLB original `Arena-Diamante.glb` se conserva intacto. La copia adaptada mantiene la arquitectura y texturas del templo de WoW como fondo, con un patio nivelado, dos bancas de nueve plazas, pedestales para los estrategas, soportes laterales para oro y un antepatio para el margen de la tienda. Los soportes de oro son decorativos; no representan todavía la economía del jugador.

El patio y el perímetro reutilizan el material original `mat_9vl_valkyr_covenantsanctum01_2888613`, con UV continuas. Los dos conjuntos laterales completos duplican el templo trasero original, conservan sus materiales y se orientan hacia el patio. Toda su geometría queda fuera de la plataforma (izquierda X ≤ -13.15; derecha X ≥ 14.35), sin ocupar las galerías de oro. El perfil de iluminación de Diamante usa AgX, exposición 1 y menos luz ambiental; los adornos planos no proyectan autosombras.

Las superficies de selección no escriben color ni profundidad. Las guías muestran 28 casillas aliadas y nueve plazas de banca únicamente durante colocación; se ocultan al soltar, salir del área, cancelar con Escape, perder el foco o comenzar el combate. La banca enemiga permanece sin guías.

El modelo exportado ya usa las coordenadas del juego. No debe recibir el ajuste de escala del templo original. Las posiciones de bancas y la cámara están en `components/arena/wowArenaLayout.ts`. Cambiar a otro rango restaura su distribución habitual.

Para regenerar el modelo y el render:

```sh
blender --background --factory-startup --python scripts/build-diamond-arena.py
```

Para verificar suelo, obstáculos, posiciones de bancas y margen del HUD:

```sh
node scripts/validate-wow-arenas.mjs
```

La comprobación valida también la iluminación, el material original, los dos conjuntos exteriores y sus límites, la invisibilidad de la cuadrícula, su detección de clics y los destinos legales. Cubre 74 posiciones por arena y el encuadre de ambas bancas de Diamante a 16:9. La compilación global de TypeScript mantiene errores previos ajenos a esta adaptación.

El fondo espacial de Diamante se genera en `components/arena/diamondCosmos.ts`: 4200 estrellas con movimiento lento y brillo variable, una franja de polvo inspirada en la Vía Láctea, dos galaxias espirales lejanas y dos planetas con iluminación y borde atmosférico. Es un efecto procedural propio, sin recursos descargados ni extraídos de WoW. Se renderiza debajo de la arena, se oculta al cambiar de rango y libera sus recursos al desmontar la escena. Este efecto animado pertenece a la app; no se incluye en el GLB ni en el render de Blender.
