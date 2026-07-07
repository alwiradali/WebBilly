# Photorealistic Real-Time 3D on the Web (2025–2026): A Production Reference for Cinematic, Camera-Matched WebGL/WebGPU

## TL;DR

- Photorealism on the web is won or lost on **four levers, in this order**: (1) image-based lighting from a real HDRI via drei `<Environment>`, (2) correct color management + ACES/AgX tone mapping, (3) physically-plausible PBR materials with real measured values and imperfection maps, and (4) a photographic post-processing “camera layer” (subtle DoF, grain, bloom, chromatic aberration). Get these right and even simple geometry reads as real; get any one wrong and it looks like a toy.
- **Integrating real photo/video with 3D** is achievable in production today: put the plate behind a transparent canvas or on a Basic-material plane, match the camera with **fSpy** (single photo) or a Blender-tracked camera exported to glTF, light the CG from an HDRI captured at the same spot, ground it with drei `<AccumulativeShadows>`/`<ContactShadows>` shadow catchers, and unify grain + a shared LUT so nothing looks “pasted on.”
- **Know when to fake it.** Transmission, SSGI, and volumetrics are expensive; bake lighting/AO in Blender, use compressed KTX2 textures and Draco/Meshopt geometry, render on-demand, and for hero moments consider pre-rendered video of a 3D render instead of live 3D. WebGPU (three r171+, `three/webgpu`) and TSL are production-viable in 2026 but still version-sensitive — verify before hardcoding.

## Key Findings

**1. IBL is the #1 realism lever.** A single high-dynamic-range panorama lighting the whole scene produces reflections, highlights and shadow direction that match reality automatically. In R3F this is `<Environment files="studio.hdr" />`; the HDRI feeds `scene.environment` and drives PBR reflections scaled by `envMapIntensity` (default 1.0). Without an env map, `MeshStandardMaterial`/`MeshPhysicalMaterial` look flat — the official three.js `MeshStandardMaterial` docs state verbatim: “Note that for best results you should always specify an environment map when using this material.”

**2. Wrong color management is the most common reason web 3D looks flat and fake.** Per the official three.js announcement “Updates to Color Management in three.js r152,” that release enabled a “linear workflow” by default (and renamed `.outputEncoding`→`.outputColorSpace`, `Texture.encoding`→`.colorSpace`). Color textures must be tagged `SRGBColorSpace`, non-color maps (normal/roughness/AO) stay `LinearSRGBColorSpace`, lighting math happens in linear, and the renderer converts to sRGB on output. Add `ACESFilmicToneMapping` (or AgX) plus an exposure value to tame blown-out HDRI highlights. R3F enables color management by default; the classic failure modes are washed-out or muddy midtones from double conversions.

**3. PBR realism comes from real values + broken perfection.** Use the metalness/roughness workflow; keep base color (albedo) out of pure black/white (roughly 30–240 sRGB); metals are metalness 1 with color in the albedo, dielectrics are metalness 0. The single highest-impact realism step after IBL is a **roughness map with variation** — fingerprints, smudges, edge wear, dust — because uniform roughness is the “CGI tell.” Surface-imperfection map libraries (grayscale scratch/smudge/fingerprint scans) layered into roughness break the perfect-equals-fake look.

**4. Glass/transmission is a solved problem in drei.** `MeshTransmissionMaterial` (extends `MeshPhysicalMaterial`) gives real refraction, chromatic dispersion, roughness-based frosting, thickness magnification and animated distortion, and can “see” the scene behind it via a render buffer.

**5. Compositing CG into real plates works on the web** using shadow catchers, camera matching, env-map lighting from the plate, and matched grain/LUT — with fSpy the key single-photo camera-solver and drei’s shadow components the grounding tools.

## Details

### 1. Photorealism fundamentals (what separates photoreal from toy/AI-looking)

**PBR metalness/roughness workflow.** three.js implements the same metallic-roughness PBR as Unreal/Blender. Use `MeshStandardMaterial` as the default realistic material and `MeshPhysicalMaterial` when you need clearcoat, transmission, sheen, iridescence or anisotropy (it costs more per pixel — enable features only as needed). Rules that sell realism:

- **Albedo/base color:** never pure `#000000` or `#FFFFFF`. Real-world measured albedos sit in a band (roughly sRGB 30–240). Pure values violate energy conservation and read as CGI.
- **Metalness is (almost) binary.** A surface is metal (1) or not (0); intermediate values only for transitions like worn edges or dust over metal. Metals take their color from albedo and have black diffuse; dielectrics (plastic, wood, skin) are metalness 0.
- **Roughness is where realism lives.** A well-authored roughness map with fingerprints, scuffs, water stains, wear and edge variation “is what makes the difference between ‘CGI-looking’ and ‘photorealistic.’” Uniform roughness = plastic toy.
- **Always pair PBR materials with an env map** (see lighting).

**Materials that read as real — parameter starting points:**

- **Clear glass:** `MeshPhysicalMaterial`/`MeshTransmissionMaterial` with `transmission: 1`, `roughness: 0`, `thickness: 1–3` (thickness acts like a magnifying/refraction depth), `ior: 1.5` (glass) up to ~2.33 (diamond/crystal).  When `transmission > 0`, keep `opacity: 1`. Add `envMap`/`<Environment>` or it looks dull. `chromaticAberration` ~0.02–0.05 for dispersion; `roughness` 0.1–0.4 for frosted glass.
- **Car paint:** `metalness` 0–0.1 base coat, `clearcoat: 1`, `clearcoatRoughness: 0.03–0.1`, a metallic-flake normal effect (3D Voronoi noise driving roughness/metalness, or a `clearcoatNormalMap`), plus a faint “orange peel” via low-amplitude noise in the clearcoat normal.  Set `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()` so flakes stay crisp at grazing angles. 
- **Skin/organic (subsurface scattering):** three.js has no built-in SSS in the standard PBR path; use the official `SubsurfaceScatteringShader` (`three/examples/jsm/shaders/SubsurfaceScatteringShader.js`) with a **thickness map** (thin areas like ears/nostrils glow), a scatter color (pink/red shallow, bluish deep), plus distortion/power/scale/attenuation uniforms. The newer community `MeshTranslucentMaterial` demonstrates wax/skin SSS. For wet/alive organic tissue, layer a clearcoat (skin oil / wetness) and a subtle specular; avoid over-driving SSS into a “glowing doughy” look.
- **Metal:** metalness 1, low roughness for polished, roughness map for brushed/worn; env map mandatory for reflections.
- **Fabric:** `sheen`, `sheenColor`, `sheenRoughness` on `MeshPhysicalMaterial` for velvet/satin edge glow; normal + roughness maps for weave.
- **Liquid:** transmission + `ior` 1.33 (water), thickness for volume, plus normal-map ripples or vertex displacement.
- **Ceramic:** metalness 0, low-mid roughness, `clearcoat` for glaze.

**Texture quality & sources.** Use full PBR sets (albedo, normal, roughness, AO, metalness, displacement). Free CC0 sources: **Poly Haven**, **ambientCG**; premium: **Poliigon**, **Quixel Megascans**. Author custom variation in **Substance** (Designer/Painter). Combine AO+Roughness+Metalness into one packed RGB texture to save memory. Avoid visibly repeating tiles — scale UVs so patterns don’t repeat, mix two materials via noise masks, and add tiling detail-normal maps for micro-surface.

**Micro-detail / imperfection maps.** Real surfaces are never clean. Layer surface-imperfection scans (dust, smudges, scratches, fingerprints, edge wear) into roughness/bump. Commercial packs (e.g., David Gruwier’s Surface Imperfections, “Mastering CGI” collections) are 4K greyscale tileable maps designed exactly for this. Match imperfection scale to real object size; hairline scratches should be fractions of a millimeter.

### 2. Lighting & environment

**Image-based lighting with HDRI (the top realism lever).** Use drei `<Environment>`:

- `files="file.hdr"` (RGBELoader for `.hdr`, EXRLoader for `.exr`, gainmap loaders for `.jpg`/`.webp` — gainmap has the smallest footprint). 
- `background={false}` to light the scene without showing the HDRI  (essential when compositing onto a photo plate so the plate stays visible); `"only"` for background-only; `true` to show it.
- `backgroundBlurriness` (0–1), `backgroundIntensity`, `environmentIntensity`, `backgroundRotation`/`environmentRotation` to orient the light.
- The `preset` prop (city/sunset/warehouse/etc.) is **explicitly not for production** — it depends on CDNs. Self-host HDRIs via `@pmndrs/assets` with dynamic imports. 
- Ground projection: `<Environment ground={{ height, radius, scale }} />`  seats a model on the environment’s floor for matching ground reflections.
- You can render a custom env from children (drei films one frame with a cube camera, configurable near/far/resolution)  or feed a `<CubeCamera>` texture — useful to derive lighting from the backplate itself.
  Source high-quality HDRIs (≥4K, ideally 8–16K for sharp reflections/close-ups) from **Poly Haven** and **Poliigon**; capture custom HDRIs on location for perfect matches.

**Realistic light setups.** Prefer soft, motivated lighting. `RectAreaLight` gives soft area highlights (great for studio/product looks and window light) but only affects `MeshStandard`/`MeshPhysical` and casts no shadows. Keep real-time shadow-casting lights to one or two. For soft shadows use `PCFSoftShadowMap`, tune `light.shadow.mapSize` (1024–2048), `shadow.bias`/`normalBias` to kill acne, and `shadow.radius`.

**Soft/contact/accumulative shadows (drei):**

- `<ContactShadows>` — fast fake contact shadow rendered to a texture; props `scale`, `blur`, `far`, `opacity`, `frames` (use `frames={1}` or a limit for static scenes). It behaves oddly if moved on X/Z — move the scene instead. 
- `<AccumulativeShadows>` + `<RandomizedLight>` — “a planar, Y-up oriented shadow-catcher that can accumulate into soft shadows and has zero performance impact after all frames have accumulated.”  `frames` default 40 (more = cleaner, slower), `temporal` for performance, `blend`, `limit`, `opacity`, `color`; `<RandomizedLight>` jiggles lights  (`amount`, `radius`, `ambient`, `intensity`, `bias`) to create raycast-like soft shadows and AO. Best quality for photoreal stills/hero shots. A vanilla-JS “Progressive Shadows” port exists.

**Global illumination approximations for the web.**

- **Baked GI/lightmaps from Blender** — the standard for arch-viz realism: bake bounce lighting and AO to texture, load as `aoMap`/lightmap. Zero runtime cost, film-quality bounce.
- **Baked AO maps** for static geometry; **SSAO/GTAO/N8AO** in post for dynamic scenes (see post-processing). `N8AO` is preferred for temporal stability.
- **Light probes** for dynamic objects moving through baked environments.
- three.js r180+ added experimental **SSGI** and **screen-space shadows** nodes (WebGPU/TSL) — promising but new; verify before production.

**Correct color management (why wrong management looks flat/fake).** Since r152 three.js defaults to a linear workflow:

- Color textures → `texture.colorSpace = THREE.SRGBColorSpace`; normal/roughness/metalness/AO stay linear.
- Renderer converts to sRGB on output (`outputColorSpace`, default sRGB); when using postprocessing, the `OutputPass`/`ToneMapping` handles it — don’t double-convert.
- `renderer.toneMapping = THREE.ACESFilmicToneMapping` with `toneMappingExposure` (~1.0–1.8) prevents HDRI highlights from blowing out. R3F/postprocessing default tone mapping is now **AgX** (softer, Blender-style); switch to ACES Filmic for punchier film contrast if desired. Wrong management → washed-out or muddy colors that no amount of relighting fixes.

### 3. Post-processing (the photographic “camera” layer)

Use `@react-three/postprocessing` (wraps pmndrs `postprocessing`); effects merge into shared passes for performance. Wrap in `<EffectComposer>` and keep `<ToneMapping>` **last**.

Recommended cinematic stack and tasteful ranges:

- **Depth of field:** `<DepthOfField focusDistance={0..1} focalLength bokehScale />`. `focusDistance` is normalized (0 = camera near, 1 = far). Subtle DoF that keeps the hero object sharp and softens background instantly reads as “shot on a real camera.”
- **Bloom:** `<Bloom luminanceThreshold={1} luminanceSmoothing={0.9} mipmapBlur intensity={...} />`. Bloom is **selective** — with a threshold of ~1 only materials pushed above 1.0 (emissive) glow. Keep it subtle; over-bloom is a top “cheap 3D” tell. If using `<ToneMapping>`, raise `luminanceThreshold` to ~1.1 to avoid everything glowing. 
- **Ambient occlusion:** `<N8AO aoRadius intensity aoSamples denoiseSamples halfRes />` (temporally stable) or `<SSAO>`. Pair with **SMAA** anti-aliasing since hardware AA doesn’t work with AO.
- **Chromatic aberration:** `<ChromaticAberration offset={[0.001–0.003, ...]} />`  — tiny, strongest at frame edges, mimics real lens fringing.
- **Film grain / sensor noise:** `<Noise opacity={0.02} />` (optionally `BlendFunction.SCREEN` / overlay). Grain is a powerful realism unifier, especially when composited over footage.
- **Vignette:** `<Vignette offset={0.1} darkness={0.5–1.1} />` — subtle.
- **Color grade / LUT:** `<LUT>` with `LUTCubeLoader` loading a `.cube` file authored in Photoshop/Nuke/DaVinci; enable `tetrahedralInterpolation` for quality.  Grade CG with the same LUT as any plate footage.
- **Lens distortion / dirt / flares:** lens-dirt textures over bloom and subtle barrel distortion add camera authenticity; note FXAA/Godrays/Lensflare have reportedly misbehaved on React 19 in some setups — test.

**How much is too much:** the goal is that no single effect is noticeable. Subtle DoF + faint grain + a touch of bloom on emissives + a matched LUT is the professional recipe; heavy chromatic aberration, strong vignette, and over-bloom are the amateur tells. Merge effects into one composer pass; too many passes degrade performance and can lose MSAA (add FXAA/SMAA).

### 4. Photo & video footage integration with 3D (compositing real plates with WebGL)

**Placing the backplate.** Three approaches:

1. **Transparent canvas + CSS** (most common for flat plates): `<Canvas gl={{ alpha: true }}>` (or vanilla `new THREE.WebGLRenderer({ alpha: true })` + `setClearColor(0x000000, 0)`), with the photo/`<video>` positioned behind the canvas via CSS z-index. The essential requirement is simply: set alpha true and don’t set a scene background.
1. **Background plane** inside the scene: `PlaneGeometry` + `MeshBasicMaterial({ map })` at the far plane, unlit so it reads as a flat plate; parent to the camera to lock it.
1. **`scene.background`** for equirectangular/spherical captures (less accurate for flat photos because it isn’t perspective-locked).

**Video as texture.** drei `useVideoTexture`/`<VideoTexture>` returns a `THREE.VideoTexture`, supports HLS `.m3u8` (hls.js) and `requestVideoFrameCallback` (`onVideoFrame`);  the video element is at `texture.image`.  On iOS the video must start **muted** or it renders black. For frame-exact offline rendering (Remotion) use `@remotion/three`’s `useOffthreadVideoTexture()`.  Use video textures for backplates, screen content, or as displacement/emissive drivers.

**Camera matching / matchmoving.**

- Matching the virtual `PerspectiveCamera` means computing the `fov` (vertical, **degrees**)  from the real lens focal length + sensor size and making canvas aspect match the plate; wrong FOV/aspect makes parallax and scale drift.
- **fSpy** is the key single-photo solver: per fspy.io and the stuffmatic/fSpy GitHub repo it is “an open source, cross platform app for still image camera matching” that “computes the approximate focal length, orientation and position of the camera in 3D space based on user defined control points in still images.” You draw guide lines along parallel real-world edges; per the official fSpy tutorial, “The polygon’s four control points define vanishing points for two perpendicular directions, which is enough to determine the camera’s focal length and orientation,” and a control point sets the 3D origin. Export **Camera parameters JSON**, read `cameraTransform.rows` into a `THREE.Matrix4`,  decompose to position/rotation, and set `fov`/aspect. Caveat: coordinate-convention conversion (Y-up, right-handed, degrees vs radians, column-major) is fiddly;  a community browser port (`fspy-calibrator`) and CodePen converters exist.
- fSpy is a **still solver, not a video matchmover.** For moving footage, track the camera in Blender’s motion tracker (or external matchmove tools), then **export the animated camera to glTF** and load with `useGLTF` (glTF stores camera nodes).

**Lighting the CG from the plate.** Capture an HDRI at the same location/camera position, or project the plate/a spherical capture as the environment via `<Environment>` children / `<CubeCamera>`, so reflections and light direction match. Tune per-material `envMapIntensity` to seat CG reflection brightness into the plate. Known gotcha: with `<Environment background={false}>` some three versions ignore `environmentIntensity`  — verify.

**Shadow & reflection catchers.**

- `THREE.ShadowMaterial` (base technique): a `receiveShadow` plane that is transparent except where shadows fall — per the three.js docs it “can receive shadows, but otherwise is completely transparent.”  Set `opacity` (~0.2) for shadow darkness; raise the plane slightly to avoid z-fighting; soften with `PCFSoftShadowMap` + `shadow.radius`. This casts the CG object’s real shadow onto the photo.
- drei `<ContactShadows>` for quick grounding; `<AccumulativeShadows>`+`<RandomizedLight>` for believable soft shadows on hero shots.
- **Reflection catchers:** no single drei component — use `<MeshReflectorMaterial>` on a ground plane for blurred planar reflections, or env-map/`<CubeCamera>` so reflective CG reflects the plate. Screen-space reflections (SSR) in pmndrs postprocessing are flagged **unstable**.

**Blending so it doesn’t look pasted on.** Apply **grain after compositing** so plate and CG share it (`<Noise>`); grade both with the **same LUT**; match **DoF** focus falloff, add subtle **chromatic aberration**/edge blur at frame edges, and a matching **vignette**. Matt DesLauriers’ “Filmic Effects for WebGL” recommends merging grain/LUT/vignette into a single pass for performance.

**Photogrammetry & Gaussian Splatting (capturing real objects/scenes as photoreal 3D).**

- **Capture:** Luma AI, Polycam, Postshot, Scaniverse produce splats/meshes from photos/video.
- **Edit/optimize:** **SuperSplat** (PlayCanvas, browser editor) crops, aligns and compresses; keep deliveries **under ~3M Gaussians for mobile, ~5M for desktop**. `.spz` is becoming the de-facto compressed delivery format.
- **Render on the web:** **Spark** (sparkjsdev, actively developed) is the recommended advanced 3DGS renderer for three.js — integrates with the three.js pipeline to “fuse splat and mesh-based objects,” is “Portable: Works across almost all devices, targeting 98%+ WebGL2 support,” and reads “`.PLY (also compressed), .SPZ, .SPLAT, .KSPLAT, .SOG`.” **mkkellogg/GaussianSplats3D** is a mature three.js implementation (MIT, but no longer actively developed — author now recommends Spark). **Luma WebGL Library** and CesiumJS (3D Tiles streaming for large/geo scenes) are alternatives.
- **Combine** splats/photogrammetry with traditional PBR meshes for photoreal environments with interactive hero objects. Splat performance is bound by GPU memory and per-frame depth sort cost, which grows worse than linearly with Gaussian count.

**2.5D parallax from a single photo (set extension / depth displacement).** Run monocular **depth estimation** (e.g., Depth Anything-class models, or online depth-map generators) to get a grayscale depth map, then either displace a subdivided plane’s vertices by the depth map (`displacementMap` / vertex shader) or use a depth-based UV-offset parallax shader (pixi.js DisplacementFilter is a simple 2D route).  Depth estimation struggles on reflective/transparent/flat surfaces.  This adds believable parallax to stills as the camera or cursor moves — great for “living photo” hero sections.

### 5. Photorealistic archetype recipes

**A. Photorealistic glass “bloom” (glass object revealing an animated internal colored element that diffuses like ink/smoke as you scroll).**

- Model the glass in Blender; import glTF. Apply drei `MeshTransmissionMaterial`: `transmission: 1`, `roughness: 0–0.15`, `thickness: 0.5–3`, `ior: 1.5`, `chromaticAberration: 0.03–0.06`, `anisotropicBlur: 0.1`,  `distortion`/`temporalDistortion` for subtle live shimmer, `backside: true` for correct thick-glass refraction, `samples: 6–10`, `resolution: 256–1024` (lower for perf). It needs an `<Environment>` for reflections or it looks dull.
- Inside the glass, place the colored element as a separate mesh. For the **color-diffusing-like-ink/smoke** effect: use a **volumetric raymarched shader** inside a bounding mesh (Beer’s Law absorption, FBM/curl-noise density field, blue-noise dithering to kill banding — see Maxime Heckel’s volumetric raymarching guides) OR a cheaper stacked-planes/particle smoke with `depthWrite: false` and additive/alpha blending. Drive density/color-spread and emission by a scroll-linked uniform (GSAP ScrollTrigger or R3F scroll) so the color “blooms” and diffuses outward. The glass transmission naturally refracts and colors the internal element.
- Because transmission materials can’t see each other by default, share a buffer (`transmissionSampler` or a manual `useFBO`) if you have multiple glass pieces.

**B. Physics objects falling into slots (cards dropping into place).**

- Use **Rapier** via `@react-three/rapier`. Wrap meshes in `<RigidBody>` (dynamic) with an appropriate collider (`cuboid` for cards; avoid trimesh where possible). Set realistic **mass/density** (a rigid body with no mass won’t fall correctly), `friction`, `restitution` (low for cards — minimal bounce), `linearDamping`/`angularDamping` for air resistance feel, and enable **CCD** for thin fast objects to prevent tunneling. Slots are `type="fixed"` colliders.
- Sell the weight with material + shadow: PBR card material (albedo + roughness + subtle normal), `castShadow`/`receiveShadow`, and a contact/accumulative shadow catcher so the card grounds believably. Use `contactSkin` and extra solver iterations for stable stacking. Simple box/hull colliders keep the sim cheap; reduce physics step frequency cautiously.

**C. Architectural / drone-footage arch-viz realism.**

- **Baked lighting is the arch-viz realism secret:** model in Blender, bake GI + AO to lightmaps, export optimized glTF. This gives film-quality bounce light at zero runtime cost — the single biggest arch-viz quality lever on the web.
- For **drone/real footage + CG**: use the compositing pipeline (§4) — camera-match (fSpy for stills, Blender-tracked camera → glTF for moving drone shots), HDRI captured on site, shadow catcher for CG buildings/objects onto the plate, matched grain/LUT.
- For **photoreal walkthroughs**: consider Gaussian splats (Spark/SuperSplat) of the real site, or baked-lighting meshes with `<Environment>`, N8AO, and contact shadows. Use LODs and on-demand rendering.

**D. Anatomical/medical — inside-the-body beating heart with blood flow.**

- **Organic tissue that looks wet/alive, not plastic:** combine subsurface scattering (SSS shader with a thickness map so thin tissue glows red/translucent) + a **clearcoat/wetness layer** (`clearcoat: 1`, low `clearcoatRoughness`, a wetness normal map) for the glistening surface + subtle specular. Red-shallow/blue-deep scatter tuning is what reads as flesh. Avoid uniform SSS (“doughy glow”).
- **Beating/pumping motion:** morph targets or a vertex shader driving rhythmic scale/deformation; bind to a clock.
- **Blood flow:** flow-map-driven scrolling normal/emissive along vessels, GPGPU particles (TSL/WebGPU compute for large counts) for cells, or a raymarched volumetric interior for chambers. Vessels as tube geometry with SSS + wetness.
- **Fluid feel:** normal-map ripples, `ior` ~1.33 transmission for plasma volumes, and subtle refraction. Keep it performant by faking volume with shaders rather than true fluid sim. Donitzo’s `three.js-volume-renderer` handles data volumes (MRI/CT) directly — relevant for accurate medical visualization.

**E. Volumetric effects (smoke, fog, dust, ink-in-water, colored gas).**

- **Real volumetrics:** raymarched shaders — march rays through a density field, accumulate light with **Beer’s Law** absorption, use **FBM/curl noise** for organic shape and **blue-noise dithering** to erase banding at low step counts (Maxime Heckel’s cloudscape/volumetric-lighting guides; Xor’s GM Shaders volumetric tutorial). Libraries: `three-volumetric-pass` (screen-space, pmndrs-postprocessing-compatible) and Donitzo’s `three.js-volume-renderer`.
- **Fake volumetrics (cheaper, production-friendly):** stacked textured planes / soft particles with `depthWrite: false` and alpha/additive blending, animated Perlin/curl noise; great for landing-page smoke/fog. Volumetric raymarching is GPU-heavy — reduce steps/half-res or fake it on mobile.

### 6. Avoiding the fake/toy/cartoon look — checklist

|Symptom (looks fake)                  |Fix                                                                               |
|--------------------------------------|----------------------------------------------------------------------------------|
|Flat, dead lighting                   |Add HDRI IBL via `<Environment>`; it’s the #1 lever                               |
|Colors washed out / muddy             |Correct color management (r152 linear workflow) + ACES/AgX tone mapping + exposure|
|Plastic/toy surfaces                  |Roughness **map** with variation (fingerprints, wear); never uniform roughness    |
|Pure black/white materials            |Keep albedo ~30–240 sRGB; respect energy conservation                             |
|Too clean / perfect                   |Layer imperfection maps: dust, smudges, scratches, edge wear                      |
|No shadows / floating objects         |Contact/accumulative shadow catchers; `castShadow`/`receiveShadow`                |
|Dull glass                            |Env map + transmission + thickness + chromatic aberration                         |
|Over-smooth CG edges                  |Normal/detail maps, micro-bevels, slight roughness variation                      |
|Sterile “video-game” render           |Photographic post: subtle DoF, grain, faint bloom on emissives, matched LUT       |
|Repeating textures                    |Scale UVs, blend materials via noise, detail normals                              |
|Default `MeshBasicMaterial`/no env map|Switch to `MeshStandardMaterial`/`MeshPhysicalMaterial` + IBL                     |

### 7. The realism pipeline & tools

- **Modeling/baking:** Blender (models, UVs, lightmap + AO baking, camera tracking, glTF export). Codrops’ “Building a Fully-Featured 3D World in the Browser with Blender and Three.js” is a strong end-to-end reference.
- **Materials/textures:** Substance (Designer/Painter); asset libraries Poly Haven, ambientCG (CC0), Poliigon, Quixel Megascans; surface-imperfection map packs.
- **Photogrammetry/splats:** Luma, Polycam, Postshot, Scaniverse (capture); SuperSplat (edit); Spark / GaussianSplats3D (render).
- **Optimization for web without killing realism:**
  - **Geometry:** Draco (`gltf-transform draco`) or **Meshopt** (faster decode, gzip-friendly). Per Khronos’ official announcement, Draco glTF geometry compression demonstrated “up to 12X compression… with no change in visual fidelity”; glTF-Transform docs note it can reduce filesize by ~95% for geometry-heavy (>1MB) models. Decode runs in a web worker.
  - **Textures:** **KTX2 / Basis Universal** (`gltf-transform` `uastc` for normals/hero maps, `etc1s` for diffuse/secondary) — stays GPU-compressed, ~10× less VRAM than PNG/JPEG (a 200KB PNG can occupy 20MB+ VRAM). Critical for iOS Safari VRAM limits. Alternatively WebP/AVIF via `gltf-transform optimize --texture-compress`.
  - **One-shot pipeline:** `gltf-transform optimize model.glb out.glb --texture-compress ktx2 --compress draco`; also `prune`, `dedup`, `resize`. Host Draco/KTX2 decoders on your CDN; set `DRACOLoader.setDecoderPath` / `KTX2Loader.setTranscoderPath`.
  - **Runtime:** LODs, instancing/BatchedMesh (keep draw calls <100 for 60fps; <500 ceiling), on-demand rendering (R3F `frameloop="demand"`), dispose unused resources, `powerPreference: "high-performance"`, disable stencil/depth where unused.

### 8. Performance vs realism — when to fake it

- **Bake instead of compute:** GI/AO → lightmaps/AO maps (Blender). Zero runtime cost, film-quality bounce. This is the #1 way to keep photoreal + performant.
- **Fake volume/lighting:** stacked-plane/particle smoke vs. raymarching; matcaps (done right, with good captured lighting) for non-interactive metallic/ceramic hero objects; env-map reflections instead of SSR.
- **Limit expensive materials:** transmission and high `samples` are costly — share transmission buffers, drop `resolution`, and cap the number of transmissive objects (they can’t see each other by default).
- **Pre-rendered vs live:** for a fixed hero animation where interactivity isn’t needed, a **pre-rendered video of a high-quality 3D render** (Blender Cycles/EEVEE) can look dramatically better than live 3D at a fraction of the runtime cost — composite it as a video texture/backplate. Reserve live 3D for genuinely interactive moments.
- **WebGPU/TSL (version-sensitive — verify):** three.js **r171+ (September 2025) ships a zero-config `WebGPURenderer`** (`import * as THREE from 'three/webgpu'`) with automatic WebGL2 fallback; Apple shipped WebGPU in Safari 26 (Sept 2025) across macOS/iOS/iPadOS/visionOS, with global coverage reported ~95%. **TSL** (Three Shader Language) compiles one shader to both WGSL and GLSL. WebGPU wins on high draw-call counts and **compute** (particles/physics/GPGPU — 1M+ particles vs ~50k WebGL ceiling); it is **not universally faster** — an ICS MEDIA benchmark (three.js r176, May 2025) found that for separate non-instanced meshes “WebGL performed about four times better” while holding 60 FPS on Intel Iris Xe. The API also sees frequent breaking changes (e.g., TSL struct-field regressions r179→r180). In R3F, initialize with an async `gl` factory that awaits `renderer.init()`. Treat specific r180+/r184 features (SSGI node, WebGPU contact shadows) as “verify before shipping.”

## Recommendations

**Stage 1 — Foundation (do these first, always).** (1) Add a real HDRI via `<Environment background={false}>`. (2) Confirm color management: sRGB on color textures, linear on data maps, `ACESFilmicToneMapping` + tuned exposure. (3) Use `MeshStandardMaterial`/`MeshPhysicalMaterial` with real albedo values and at minimum a roughness map. **Benchmark to advance:** the scene should already look “lit like a photo” before any post. If it still looks flat, the problem is IBL or color management, not materials.

**Stage 2 — Material & detail realism.** Add PBR texture sets (Poly Haven/Megascans/Poliigon), imperfection maps into roughness, correct per-material params (glass/metal/skin/car-paint values above), and shadow catchers (`<ContactShadows>` for dynamic, `<AccumulativeShadows>` for hero stills). **Benchmark:** surfaces should show non-uniform reflections and grounded shadows.

**Stage 3 — Camera layer.** Add subtle DoF, N8AO + SMAA, faint bloom (threshold ~1, emissive-only), light grain, a matched LUT, and a hint of chromatic aberration/vignette. **Benchmark:** effects should be individually unnoticeable; if any effect “reads,” dial it back.

**Stage 4 — Footage integration (if compositing).** Transparent canvas or Basic-plane plate → fSpy/Blender camera match → on-site HDRI lighting → shadow catcher → shared grain + LUT. **Benchmark:** toggle the CG off/on; if it looks “pasted,” you’re missing shadow contact, grain match, or grade match.

**Stage 5 — Optimize.** Run `gltf-transform optimize … --texture-compress ktx2 --compress draco`, add LODs/instancing, on-demand rendering, and bake GI/AO. **Threshold to change approach:** if draw calls >500 or you can’t hold 60fps on target mobile after optimization, switch a hero element to baked/pre-rendered video, or move compute-heavy work to WebGPU/TSL.

**When to choose WebGPU:** adopt if you need heavy compute (huge particle systems, GPGPU physics, complex TSL post) or very high draw-call counts; otherwise WebGL2 remains the safe default in 2026. Always ship the WebGL2 fallback.

## Caveats

- **Version sensitivity (verify, don’t hardcode):** WebGPU/TSL APIs change frequently (r179→r180 TSL regressions; r180 WebGPU renderTarget readback bugs; new SSGI/screen-space-shadow/WebGPU-contact-shadow nodes are recent). drei/postprocessing APIs also shift — `@react-three/postprocessing` v3 changed `EffectComposer` and requires `<ToneMapping>` last; confirm against installed versions.
- **drei `<Environment preset>` is not for production** (CDN dependency) — self-host HDRIs.
- **fSpy solves stills, not motion** — moving footage needs true matchmoving (Blender tracker → glTF camera). The coordinate-conversion step is error-prone.
- **SSR is unstable** in pmndrs postprocessing; prefer reflector material / env maps.
- **Gaussian splat performance** is bounded by GPU memory and per-frame sort; mobile realistically caps around 3M Gaussians. Splat tooling/formats (`.spz`, SOG) are evolving fast in 2025–2026.
- **Some cited figures are directional, not universal:** VRAM multipliers, Gaussian budgets, draw-call thresholds and FPS numbers vary by device/driver/scene — treat as starting points and profile (r3f-perf, stats-gl, Spector.js).
- **Transmission limitations:** transmissive materials don’t see each other by default; expect extra render cost and possible flicker with multiple transmissive objects.
- The subagent-sourced browser fSpy port (`fspy-calibrator`) is a promising community tool dated 2026, not a battle-tested standard; the desktop fSpy → JSON route is the proven path.