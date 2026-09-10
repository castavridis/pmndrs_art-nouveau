import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { tokens } from '../nav/tokens'
import { preloadCalloutIcon, useCalloutIcon } from './calloutAssets'
import { Ready } from '../nav/Nav3D/Ready'
import iconOutline from '../nav/assets/fallback/outline/callout-icon.svg?raw'
import { DrawnOutline } from '../nav/DrawnOutline'
import fallback from '../nav/assets/fallback/manifest.json'
import styles from './Callout.module.css'
import { callout } from './calloutMetrics'
import { calloutKinds, kindHex, type CalloutKind } from './calloutKinds'
import { useTuning, type GlassPreset, type MaterialChoice } from '../nav/Nav3D/tuning'
import type { PresetName } from '../nav/Nav3D/customPresets'
import { useInk } from '../nav/Nav3D/dom'
import { useIsClient } from '../isClient'
import { useDomTilt, usePointerParallax } from './parallax'
import * as THREE from 'three'
import { useMeasure } from './useMeasure'
import { useOutlines } from '../nav/outlines'
import { useSvgTexture } from './svgTexture'
import { Backing } from '../nav/Nav3D/Backing'
import { ParallaxRig } from './ParallaxRig'
import { useFrame } from '@react-three/fiber'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

if (typeof window !== 'undefined') preloadCalloutIcon()

export interface CalloutProps {
  /**
   * `surface`: a 3D glass slab behind DOM content. `plain`: a CSS card with only the icon in 3D.
   * `svg`: vector outlines only (the traced icon, an outlined card), no WebGL. The 3D variants
   * show the svg look while their canvas loads and cross-fade once it has rendered.
   */
  variant: 'surface' | 'plain' | 'svg' | 'shared'
  /** Shared mode: the page scene has drawn `CalloutParts` for this card. */
  sharedReady?: boolean
  /** Shared mode: reports the card element and its measured size for the page scene. */
  onSlot?: (el: HTMLDivElement | null, size: { width: number; height: number }) => void
  /** GitHub-style kind: sets the symbol inside the lens, the label and the palette tint. */
  kind?: CalloutKind
  title: string
  children: ReactNode
  postprocessing?: boolean
  /** Show the scene's light strips in this surface's reflections (the refracted lines are a global tuning). */
  strips?: boolean
  /** Maximum card width; the card fills its container up to this (default 560). */
  maxWidth?: number | string
}

/**
 * A callout: the announcement icon (lens + leaves) in the top-left corner and DOM content.
 * Content is always DOM (accessible, selectable, wraps); only the decoration is 3D.
 */
export function Callout({
  variant,
  kind = 'note',
  title,
  children,
  postprocessing = true,
  strips = true,
  maxWidth = callout.width,
  sharedReady = false,
  onSlot,
}: CalloutProps) {
  // The card is sized by its DOM content (width from the container, height from the text) and
  // the 3D slab follows the measured box; until measured (and in SSR) it uses the metrics.
  const outer: CSSProperties = { width: '100%', maxWidth }
  const bleed = tokens.clusterBleedX
  const k = calloutKinds[kind]
  const tint = kindHex(kind)
  const preset: GlassPreset = k.colour
  const surfacePreset = useSurfacePreset(kind)
  const { ink } = useInk()
  const client = useIsClient()
  const symbolRef = useRef<HTMLDivElement>(null)
  // Parallax: the pointer over the card tilts the 3D layers (icon more than surface) and the
  // DOM content; the plain card tilts as a whole in CSS.
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pointer = usePointerParallax(rootRef)
  const size = useMeasure(rootRef, { width: callout.width, height: callout.height })
  const narrow = size.width < 440
  useDomTilt(contentRef, pointer, variant === 'plain' ? 0 : 1.5, 4)
  const cardRef = useRef<HTMLDivElement>(null)
  useDomTilt(cardRef, pointer, variant === 'plain' ? 4 : 0, 0)
  // 3D readiness: vector outlines until the canvas has drawn its first frames.
  const [ownReady, setReady] = useState(false)
  const ready = variant === 'shared' ? sharedReady : ownReady
  const vector = variant === 'svg' || !ready
  // The same glyph the DOM draws, rasterised for the scene once the 3D lens is up.
  const glyph = useSvgTexture(symbolRef, tint, 256, [kind, vector])
  // Glass surfaces carry the main glass: the ink follows its backdrop (light on dark glass),
  // like the announcement. The plain card keeps its own light gradient and dark ink.
  const glassInk = variant !== 'plain' && client && !vector ? ink : undefined
  useEffect(() => {
    if (variant === 'shared') onSlot?.(rootRef.current, size)
  }, [variant, onSlot, size])
  // Dev: outlines over the live 3D as well.
  const overlay = useOutlines((s) => s.overlay)
  const outlines = vector || overlay
  const m = fallback['callout-icon']
  return (
    <div ref={rootRef} className={styles.parallaxRoot} style={outer}>
      <div
        ref={cardRef}
        className={`${styles.root} ${variant === 'plain' && !vector ? styles.plain : ''} ${vector ? styles.vector : ''} ${outlines ? styles.outlined : ''}`}
        style={{ color: glassInk }}
      >
        {/* Vector layer: traced outline of the icon, in place until the 3D one is up. */}
        <DrawnOutline
          key={outlines ? 'icon-on' : 'icon-off'}
          className={styles.vectorIcon}
          src={iconOutline}
          width={m.width}
          height={m.height}
          play={outlines}
          style={{
            left: callout.iconX - m.originX,
            top: callout.iconY - m.originY,
            opacity: outlines ? 1 : 0,
          }}
        />
        {variant === 'surface' ? (
          // One canvas covers the card plus a bleed so the icon can overhang the corner.
          <div
            className={styles.canvas}
            style={{ inset: -bleed, opacity: ready ? 1 : 0 }}
            aria-hidden="true"
          >
            <NavCanvas postprocessing={postprocessing} strips={strips}>
              <Suspense fallback={null}>
                <ParallaxRig pointer={pointer} depth={0}>
                  <Surface preset={surfacePreset} width={size.width} height={size.height} />
                </ParallaxRig>
                <ParallaxRig pointer={pointer} depth={1}>
                  <IconAtCorner preset={preset} width={size.width} height={size.height} glyph={glyph} />
                </ParallaxRig>
                <Ready onReady={() => setReady(true)} />
              </Suspense>
              {DevHandles && (
                <Suspense fallback={null}>
                  <DevHandles />
                </Suspense>
              )}
            </NavCanvas>
          </div>
        ) : variant === 'plain' ? (
          // CSS card; a small transparent canvas holds just the icon at the corner.
          <div
            className={styles.canvas}
            style={{
              left: callout.iconX - callout.icon * 1.6,
              top: callout.iconY - callout.icon * 1.6,
              width: callout.icon * 3.2,
              height: callout.icon * 3.2,
              opacity: ready ? 1 : 0,
            }}
            aria-hidden="true"
          >
            <NavCanvas postprocessing={false} strips={strips}>
              <Suspense fallback={null}>
                <ParallaxRig pointer={pointer} depth={1} tilt={0.15}>
                  <Icon preset={preset} glyph={glyph} />
                </ParallaxRig>
                <Ready onReady={() => setReady(true)} />
              </Suspense>
              {DevHandles && (
                <Suspense fallback={null}>
                  <DevHandles />
                </Suspense>
              )}
            </NavCanvas>
          </div>
        ) : null}
        {/* The kind's symbol. When the 3D lens is up the same glyph is rasterised into the
            scene (so the glass refracts it) and this copy only holds the artwork. */}
        <div
          ref={symbolRef}
          className={`${styles.symbol} ${glyph ? styles.symbolPrinted : ''}`}
          style={{
            left: callout.iconX,
            top: callout.iconY,
            fontSize: callout.icon * 0.42,
            color: tint,
          }}
          aria-hidden="true"
        >
          {k.icon}
        </div>
        <div
          ref={contentRef}
          className={styles.content}
          style={
            narrow
              ? {
                  // Phone widths: the text runs below the lens instead of beside it.
                  padding: callout.padding * 0.7,
                  paddingTop: callout.iconY + callout.icon / 2 + 12,
                }
              : {
                  padding: callout.padding,
                  paddingLeft: callout.iconX + callout.icon * 0.75,
                  // Never shorter than the icon needs, however little content there is.
                  minHeight: callout.iconY + callout.icon / 2 + callout.padding,
                }
          }
        >
          <div className={styles.kind} style={{ color: tint }}>
            {k.label}
          </div>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </div>
  )
}

interface Box {
  width: number
  height: number
}

/**
 * Which material the surface wears (materials.callout): the main tuned glass by default, so
 * callouts match the pill and the announcement; `kind` tints it with the kind's colour.
 */
function useSurfacePreset(kind: CalloutKind): PresetName | undefined {
  const choice = useTuning((s) => s.materials.callout)
  if (choice === 'live') return undefined
  if (choice === 'kind') return calloutKinds[kind].colour
  return choice
}

/** The card's 3D parts (surface + lens icon at the corner), centred at the origin, for a shared page scene. */
export function CalloutParts({ kind, width, height, sampler = false, glyph }: { kind: CalloutKind; sampler?: boolean; glyph?: THREE.Texture | null } & Box) {
  const icon: GlassPreset = calloutKinds[kind].colour
  const surface = useSurfacePreset(kind)
  return (
    <>
      {sampler && <Backing width={width} height={height} depth={callout.depth} preset={surface} />}
      <Surface preset={surface} width={width} height={height} sampler={sampler} />
      <IconAtCorner preset={icon} width={width} height={height} glyph={glyph} />
    </>
  )
}

/** The glass slab, centred in the canvas (which is the card plus bleed), rebuilt per card size. */
function Surface({ preset, width, height, sampler = false }: { preset?: PresetName; sampler?: boolean } & Box) {
  const geometry = useMemo(
    () => makeRoundedRectGeometry(width, height, callout.radius, callout.depth),
    [width, height],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <Glass preset={preset} sampler={sampler} />
    </mesh>
  )
}

/** Icon placed at the card's top-left corner (canvas origin is the card centre). */
function IconAtCorner({ preset, width, height, glyph }: { preset: GlassPreset; glyph?: THREE.Texture | null } & Box) {
  const x = (-width / 2 + callout.iconX) / tokens.pxPerUnit
  const y = (height / 2 - callout.iconY) / tokens.pxPerUnit
  return (
    <group position={[x, y, callout.depth / 2 / tokens.pxPerUnit + 0.02]}>
      <Icon preset={preset} glyph={glyph} />
    </group>
  )
}

/**
 * The glyph is drawn over tinted glass, which takes a bite out of it. A white multiplier just
 * above 1 puts the light back; it multiplies the raster, so the symbol keeps the kind's colour
 * rather than being recoloured. Much higher and the channels clip on a dark lens and the
 * symbol turns grey. (A bare number here would be read as a hex value — 4 is 0x000004.)
 */
const GLYPH_GAIN = new THREE.Color(1.4, 1.4, 1.4)

/** The ring alone is drawn at three quarters; the leaves stay the size they were traced at. */
const LENS_SCALE = 0.75

/** Lens ring with the two leaves, scaled so the icon is `callout.icon` px across. */
export function Icon({ preset, glyph }: { preset: GlassPreset; glyph?: THREE.Texture | null }) {
  const { lens, leafTop, leafBottom, size } = useCalloutIcon()
  const s = callout.icon / tokens.pxPerUnit / size
  // Each part's material (materials folder): the kind colour by default, the main glass, or a preset.
  const m = useTuning((st) => st.materials)
  const pick = (c: MaterialChoice | 'kind'): PresetName | undefined => (c === 'kind' ? preset : c === 'live' ? undefined : c)

  const bounds = useMemo(() => {
    lens.computeBoundingBox()
    leafTop.computeBoundingBox()
    leafBottom.computeBoundingBox()
    const l = lens.boundingBox!
    const t = leafTop.boundingBox!
    const b = leafBottom.boundingBox!
    // The ring's own axis, not the export's origin — the lens is off-centre in the file, which
    // left the symbol sitting low and to the left of the glass it belongs to. Shrinking the ring
    // about this point keeps it where it was.
    const centre = l.getCenter(new THREE.Vector3())
    // The lens after it is taken to LENS_SCALE about that centre.
    const scaled = (z: number) => (z - centre.z) * LENS_SCALE + centre.z
    // Drop the leaf behind the lens, as the flat fallback draws it.
    const leafShift = scaled(l.min.z) - t.max.z - (l.max.z - l.min.z) * 0.1
    return {
      centre,
      glyph: {
        // On the lens's front face rather than inside it. Transmission offsets whatever is behind
        // the surface by the material's own thickness along the refracted ray — a fixed slide that
        // grows with how far off the camera's axis the lens sits, so a symbol under the glass
        // drifts off the ring on a wide card however shallow it is buried, and comes back only
        // through the low-resolution transmission buffer. On the face it stays centred and sharp,
        // with the dome's rim and highlights still around it.
        z: l.max.z + (l.max.z - l.min.z) * 0.02,
        size: (l.max.x - l.min.x) * 0.42,
      },
      leafShift,
      // The whole icon rides above its backmost part, so the leaves clear the card's front
      // face instead of being sliced by it.
      lift: -Math.min(scaled(l.min.z), t.min.z + leafShift, b.min.z),
    }
  }, [lens, leafTop, leafBottom])

  return (
    <group scale={s} position-z={bounds.lift * s}>
      <group
        scale={LENS_SCALE}
        position={bounds.centre.clone().multiplyScalar(1 - LENS_SCALE)}
      >
        {glyph && (
          <GlyphFace centre={bounds.centre} z={bounds.glyph.z} size={bounds.glyph.size} map={glyph} />
        )}
        <mesh geometry={lens} name="callout lens">
          <Glass sampler preset={pick(m.calloutLens)} />
        </mesh>
      </group>
      <mesh geometry={leafTop} name="callout leaf top" position-z={bounds.leafShift}>
        <Glass sampler preset={pick(m.calloutLeafTop)} />
      </mesh>
      <mesh geometry={leafBottom} name="callout leaf bottom">
        <Glass sampler preset={pick(m.calloutLeafBottom)} />
      </mesh>
    </group>
  )
}

// Scratch for the solve below; frame callbacks run one at a time, so one pair is enough.
const axis = new THREE.Vector3()
const face = new THREE.Vector3()

/**
 * The kind's symbol on the lens's front face, held on the ring's optical axis.
 *
 * The face is nearer the camera than the ring's widest circle, so on a wide card — where the
 * icon sits well off the camera's axis — perspective throws the two apart and the symbol reads
 * as sliding out of its lens. Each frame this solves for the point on the face that projects
 * onto the ring's centre: x / (camZ − z) is constant along a ray, so the face's x follows from
 * the axis's. It also absorbs whatever tilt the parallax rig is applying.
 */
function GlyphFace({
  centre,
  z,
  size,
  map,
}: {
  centre: THREE.Vector3
  z: number
  size: number
  map: THREE.Texture
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    const mesh = ref.current
    const parent = mesh?.parent
    if (!mesh || !parent) return
    parent.localToWorld(axis.copy(centre))
    parent.localToWorld(face.set(centre.x, centre.y, z))
    const span = camera.position.z - axis.z
    if (Math.abs(span) > 1e-4) {
      const k = (camera.position.z - face.z) / span
      face.x = camera.position.x + (axis.x - camera.position.x) * k
      face.y = camera.position.y + (axis.y - camera.position.y) * k
    }
    mesh.position.copy(parent.worldToLocal(face))
  })
  return (
    <mesh ref={ref} raycast={() => null}>
      <planeGeometry args={[size, size]} />
      {/* Alpha cutout rather than blending: three's transmission pass renders only opaque
          objects, so a blended glyph would vanish from every glass surface that samples it. */}
      <meshBasicMaterial map={map} color={GLYPH_GAIN} alphaTest={0.35} toneMapped={false} />
    </mesh>
  )
}
