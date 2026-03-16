const backCanvas = document.getElementById("energy-canvas");
const frontCanvas = document.getElementById("energy-canvas-front");
const earthImage = document.getElementById("earth-image");
const brandWash = document.getElementById("brand-wash");
const brandLogo = document.getElementById("brand-logo");
const brandWordmark = document.getElementById("brand-wordmark");
const brandLineTop = document.getElementById("brand-line-top");
const brandLineBottom = document.getElementById("brand-line-bottom");
const fallbackMessage = document.querySelector("[data-fallback]");

const PARAMS = {
  renderer: {
    maxDpr: 1.85,
    maxTrailPoints: 20,
    powerPreference: "high-performance",
  },
  orb: {
    radius: 0.0075,
    motionRadiusBoost: 0.004,
    glowRadius: 2.5,
    wideGlowRadius: 8,
    distantGlowRadius: 0.04,
    distantGlowIntensity: 0.018,
    outerGlowIntensity: 0.022,
    wideGlowIntensity: 0.006,
    wideGlowVioletIntensity: 0.002,
    plasmaShellIntensity: 0.16,
    hotShellIntensity: 0.07,
    coronaIntensity: 0.09,
    coronaVioletIntensity: 0.035,
    arcIntensity: 0.09,
    coreIntensity: 0.58,
    highlightIntensity: 0.08,
    vaporIntensity: 0.015,
  },
  motion: {
    speedNormalization: 1400,
    visualSpeedClamp: 1800,
    velocitySmoothing: 8,
    velocitySmoothingMin: 0.08,
    velocitySmoothingMax: 0.22,
    visualMotionSmoothing: 7,
    visualMotionSmoothingMin: 0.08,
    visualMotionSmoothingMax: 0.2,
  },
  idle: {
    xFrequency: 0.72,
    yFrequency: 0.96,
    xAmplitude: 0.08,
    yAmplitude: 0.06,
  },
  follow: {
    stiffness: 20,
    damping: 8.6,
  },
  trail: {
    headResponseBase: 0.31,
    headResponseMotionBoost: 0.16,
    headResponseDtScale: 8.5,
    headResponseMin: 0.16,
    headResponseMax: 0.54,
    segmentDelayBase: 0.18,
    segmentDelayIndexFalloff: 0.0045,
    segmentDelayMotionBoost: 0.05,
    segmentDelayDtScale: 6.4,
    segmentDelayMin: 0.048,
    segmentDelayMax: 0.28,
    motionScale: 950,
    widthMin: 0.002,
    widthMax: 0.03,
    idleVisibility: 0.08,
    pointRadiusMin: 0.004,
    pointRadiusMax: 0.02,
  },
  sequence: {
    earthDelaySeconds: 3,
    earthFadeDuration: 1.6,
    approachDuration: 1, //1.45
    frontArcDuration: 2, //2.25
    backArcDuration: 2, //2.45
    reentryDuration: 0.95, //0.95
    finalArcDuration: 1.0, //1.8
    edgeInset: 48,
    cometFadeOutSpeed: 1.5, // Multiplier for comet fade-out speed during the final swoop. Default: 1.
  },
  earth: {
    radiusMultiplier: 0.46,
    scaleStart: 0.9,
    scaleEnd: 1,
  },
  brand: {
    minWidth: 260,
    maxWidth: 700,
    logoFinalWidth: 620, // Final rendered logo width in pixels. Default: 352px.
    logoOffsetX: 20, // Horizontal logo offset from screen center in pixels. Default: 0px.
    logoOffsetY: 15, // Vertical logo offset from screen center in pixels. Default: 0px.
    logoScaleStart: 0.02,
    logoScaleEnd: 1,
    logoFadeInSpeed: 1, // Multiplier for logo fade-in speed. Default: 1.
    wordmarkOffsetX: -80, // Horizontal offset applied to the entire brand name in pixels. Default: 0px.
    wordmarkStartOffset: {
      x: 0, // Starting horizontal brand-name offset as an earth-radius multiplier. Default: 0.
      y: -1.08, // Starting vertical brand-name offset as an earth-radius multiplier. Default: -0.08.
    },
    wordmarkEndOffset: {
      x: 0, // Final horizontal brand-name offset as an earth-radius multiplier. Default: 0.
      y: 1.02, // Final vertical brand-name offset as an earth-radius multiplier. Default: 1.02.
    },
    wordmarkScaleStart: 0.1,
    wordmarkScaleEnd: .6,
    wordmarkFadeInSpeed: .6, // Multiplier for brand-name fade-in speed. Default: 1.
    topFontSize: 180, // Maximum font size for the top brand-name row in pixels. Default: 180px.
    bottomFontSize: 102, // Maximum font size for the bottom brand-name row in pixels. Default: 110px.
    postReveal: {
      pauseDuration: 1.0, // Seconds to hold the completed brand lockup before moving it. Default: 0.
      transitionDuration: 1, // Seconds for the top-left transition after the pause. Default: 1.
      homepageUrl: "home.html", // Destination page to load after the top-left transition completes.
      logoTargetLeft: 10, // Final logo left position in pixels. Default: 0px.
      logoTargetTop: 5, // Final logo top position in pixels. Default: 0px.
      logoTargetHeight: 50, // Final logo height in pixels while maintaining aspect ratio. Default: 50px.
      wordmarkTargetLeft: 70, // Final wordmark left offset in pixels. Default: 60px.
      wordmarkTargetTop: 5, // Final wordmark top position in pixels. Default: 0px.
      wordmarkTargetHeight: 45, // Final wordmark height in pixels while maintaining aspect ratio. Default: 50px.
    },
  },
  layers: {
    frontOverlayOpacity: 1.2,
    frontBackfillOpacity: 0.03,
    backPassOpacity: 0.68,
  },
};

const MAX_TRAIL_POINTS = PARAMS.renderer.maxTrailPoints;
const FLOATS_PER_POINT = 4;
const HOME_LOCKUP_STORAGE_KEY = "clairiva-home-lockup";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * clamp(value, 0, 1)) - 1) * 0.5;
}

function easeInOutCubic(value) {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) * 0.5;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

function applySpeedMultiplier(progress, speed) {
  return clamp(progress * Math.max(speed, 0.0001), 0, 1);
}

function mixPoint(a, b, alpha) {
  return {
    x: lerp(a.x, b.x, alpha),
    y: lerp(a.y, b.y, alpha),
  };
}

function distanceBetween(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function cubicBezier(p0, p1, p2, p3, t) {
  const ab = mixPoint(p0, p1, t);
  const bc = mixPoint(p1, p2, t);
  const cd = mixPoint(p2, p3, t);
  const abbc = mixPoint(ab, bc, t);
  const bccd = mixPoint(bc, cd, t);
  return mixPoint(abbc, bccd, t);
}

function estimateBezierPeakSpeed(p0, p1, p2, p3, duration, easing, samples = 48) {
  const safeDuration = Math.max(duration, 0.0001);
  const dt = safeDuration / samples;
  let previous = cubicBezier(p0, p1, p2, p3, easing(0));
  let peakSpeed = 0;

  for (let index = 1; index <= samples; index += 1) {
    const progress = index / samples;
    const point = cubicBezier(p0, p1, p2, p3, easing(progress));
    peakSpeed = Math.max(peakSpeed, distanceBetween(previous, point) / dt);
    previous = point;
  }

  return peakSpeed;
}

function buildBezierArcTable(p0, p1, p2, p3, samples = 48) {
  const points = [p0];
  const lengths = [0];
  let totalLength = 0;
  let previous = p0;

  for (let index = 1; index <= samples; index += 1) {
    const point = cubicBezier(p0, p1, p2, p3, index / samples);
    totalLength += distanceBetween(previous, point);
    points.push(point);
    lengths.push(totalLength);
    previous = point;
  }

  return {
    points,
    lengths,
    totalLength,
  };
}

function sampleArcTable(table, alpha) {
  const clampedAlpha = clamp(alpha, 0, 1);
  const targetLength = table.totalLength * clampedAlpha;

  for (let index = 1; index < table.lengths.length; index += 1) {
    const segmentEnd = table.lengths[index];

    if (targetLength <= segmentEnd) {
      const segmentStart = table.lengths[index - 1];
      const segmentLength = Math.max(segmentEnd - segmentStart, 0.0001);
      const segmentAlpha = (targetLength - segmentStart) / segmentLength;
      return mixPoint(table.points[index - 1], table.points[index], segmentAlpha);
    }
  }

  return table.points[table.points.length - 1];
}

function getFinalSwoopMetrics(anchors) {
  const frontReturnArc = buildBezierArcTable(
    anchors.swOrbit,
    anchors.reentryControls[0],
    anchors.reentryControls[1],
    anchors.frontReturnPoint
  );
  const finalSwoopSpeed = estimateBezierPeakSpeed(
    anchors.swOrbit,
    anchors.reentryControls[0],
    anchors.reentryControls[1],
    anchors.frontReturnPoint,
    PARAMS.sequence.reentryDuration,
    easeInOutSine
  );
  const speed = Math.max(finalSwoopSpeed, 1);
  const frontReturnDuration = frontReturnArc.totalLength / speed;
  const finalPassDistance = distanceBetween(anchors.frontReturnPoint, anchors.neEdge);
  const finalPassDuration = finalPassDistance / speed;

  return {
    frontReturnArc,
    frontReturnDuration,
    finalPassDuration,
    totalDuration: frontReturnDuration + finalPassDuration,
  };
}

function parseCssColorToVec3(colorValue, fallback) {
  const value = colorValue.trim();

  if (value.startsWith("#")) {
    let hex = value.slice(1);

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((digit) => digit + digit)
        .join("");
    }

    if (hex.length === 6) {
      const intValue = Number.parseInt(hex, 16);

      if (Number.isFinite(intValue)) {
        return new Float32Array([
          ((intValue >> 16) & 255) / 255,
          ((intValue >> 8) & 255) / 255,
          (intValue & 255) / 255,
        ]);
      }
    }
  }

  const match = value.match(/rgba?\(([^)]+)\)/i);

  if (match) {
    const [red = "0", green = "0", blue = "0"] = match[1]
      .split(/[,\s/]+/)
      .filter(Boolean);

    return new Float32Array([
      clamp(Number.parseFloat(red), 0, 255) / 255,
      clamp(Number.parseFloat(green), 0, 255) / 255,
      clamp(Number.parseFloat(blue), 0, 255) / 255,
    ]);
  }

  return fallback;
}

function readBackgroundColors() {
  const styles = window.getComputedStyle(document.documentElement);

  return {
    top: parseCssColorToVec3(styles.getPropertyValue("--bg-top"), new Float32Array([0.007, 0.011, 0.03])),
    bottom: parseCssColorToVec3(styles.getPropertyValue("--bg-bottom"), new Float32Array([0.02, 0.01, 0.055])),
  };
}

const vertexShaderSource = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

const int MAX_TRAIL = ${MAX_TRAIL_POINTS};

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uOrb;
uniform vec2 uVelocity;
uniform float uSpeed;
uniform vec4 uTrail[MAX_TRAIL];
uniform vec3 uBgTop;
uniform vec3 uBgBottom;
uniform float uBgMix;
uniform float uOrbOpacity;

varying vec2 vUv;

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 78.233);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 basis = mat2(1.6, 1.2, -1.2, 1.6);

  for (int i = 0; i < 5; i += 1) {
    value += amplitude * noise(p);
    p = basis * p;
    amplitude *= 0.5;
  }

  return value;
}

float falloff(float distanceValue, float inner, float outer) {
  return 1.0 - smoothstep(inner, outer, distanceValue);
}

vec2 toScene(vec2 pixelPoint) {
  return (pixelPoint - 0.5 * uResolution.xy) / uResolution.y;
}

float segmentProjection(vec2 p, vec2 a, vec2 b) {
  vec2 ba = b - a;
  float denominator = max(dot(ba, ba), 0.00001);
  return clamp(dot(p - a, ba) / denominator, 0.0, 1.0);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float denominator = max(dot(ba, ba), 0.00001);
  float h = clamp(dot(pa, ba) / denominator, 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 scene = toScene(frag);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 centeredUv = vUv - 0.5;

  vec3 backgroundColor = mix(uBgTop, uBgBottom, vUv.y);

  float fieldNoise = fbm(scene * 4.5 + vec2(0.0, uTime * 0.025));
  float aurora = fbm(vec2(scene.x * 3.8, scene.y * 2.1 + uTime * 0.06));
  backgroundColor += vec3(0.004, 0.01, 0.02) * fieldNoise;
  backgroundColor += vec3(0.004, 0.008, 0.02) * aurora * 0.65;

  float starLayerA = pow(saturate(noise(frag * 0.02 + 14.0) - 0.84), 7.0);
  float starLayerB = pow(saturate(noise(frag * 0.038 + 91.0) - 0.885), 10.0);
  backgroundColor += vec3(0.08, 0.14, 0.24) * starLayerA * 0.35;
  backgroundColor += vec3(0.25, 0.45, 0.8) * starLayerB * 0.18;

  vec2 orbScene = toScene(uOrb);
  vec2 velocityScene = uVelocity / uResolution.y;
  float speedNorm = saturate(uSpeed / ${PARAMS.motion.speedNormalization.toFixed(1)});
  vec2 direction = normalize(velocityScene + vec2(0.0001, 0.0));
  vec2 tangent = vec2(-direction.y, direction.x);
  vec2 relative = scene - orbScene;

  float distantGlow = exp(-dot(relative, relative) / ${PARAMS.orb.distantGlowRadius.toFixed(4)});
  backgroundColor += vec3(0.007, 0.016, 0.038) * distantGlow * ${PARAMS.orb.distantGlowIntensity.toFixed(3)};

  vec3 tailColor = vec3(0.0);
  float tailMist = 0.0;

  for (int i = 1; i < MAX_TRAIL; i += 1) {
    vec4 tailPoint = uTrail[i];
    vec4 headPoint = uTrail[i - 1];
    float active = step(0.001, tailPoint.z * headPoint.z);

    vec2 a = toScene(tailPoint.xy);
    vec2 b = toScene(headPoint.xy);
    float age = tailPoint.w;
    float freshness = 1.0 - age;
    float projection = segmentProjection(scene, a, b);
    float distanceToSegment = sdSegment(scene, a, b);

    float segmentNoise = fbm(
      scene * mix(8.0, 18.0, freshness) +
      vec2(age * 16.0, -uTime * 0.8 - age * 13.0)
    );

    float width = mix(${PARAMS.trail.widthMin.toFixed(3)}, ${PARAMS.trail.widthMax.toFixed(3)}, pow(freshness, 1.1));
    width *= mix(0.88, 1.22, segmentNoise);
    width *= mix(0.8, 1.32, speedNorm);

    float density = mix(0.32, 1.28, freshness);
    density *= mix(0.88, 1.1, projection);

    float plume = exp(-(distanceToSegment * distanceToSegment) / max(width * width, 0.00001));
    float innerThread = falloff(
      distanceToSegment + (segmentNoise - 0.5) * width * 0.45,
      0.0,
      width * 0.48
    );
    float edgeSpark = falloff(abs(distanceToSegment - width * (0.28 + segmentNoise * 0.3)), 0.0, width * 0.18);
    float breakup = mix(0.72, 1.18, segmentNoise);
    float segmentEnergy = active * density * breakup;

    tailColor += vec3(0.028, 0.09, 0.23) * plume * segmentEnergy * 0.85;
    tailColor += vec3(0.05, 0.32, 0.85) * plume * segmentEnergy * 0.95;
    tailColor += vec3(0.12, 0.46, 1.05) * plume * segmentEnergy * pow(freshness, 1.55) * 0.38;
    tailColor += vec3(0.15, 0.82, 1.55) * innerThread * segmentEnergy * mix(0.26, 1.15, freshness);
    tailColor += vec3(0.85, 0.96, 1.45) * edgeSpark * segmentEnergy * freshness * 0.22;
    tailMist += plume * segmentEnergy;
  }

  for (int i = 0; i < MAX_TRAIL; i += 1) {
    vec4 point = uTrail[i];
    float active = step(0.001, point.z);
    float age = point.w;
    float freshness = 1.0 - age;
    vec2 pointScene = toScene(point.xy);
    float pointDistance = length(scene - pointScene);
    float pointRadius = mix(0.008, 0.06, freshness);
    float pointGlow = exp(-(pointDistance * pointDistance) / max(pointRadius * pointRadius, 0.00001));

    tailColor += vec3(0.02, 0.08, 0.2) * pointGlow * active * 0.4;
    tailColor += vec3(0.05, 0.23, 0.68) * pointGlow * active * freshness * 0.42;
  }

  vec2 stretched = vec2(
    dot(relative, direction) / mix(1.0, 1.36, speedNorm),
    dot(relative, tangent) / mix(1.0, 0.84, speedNorm)
  );

  float radius = mix(${PARAMS.orb.radius.toFixed(4)}, ${(PARAMS.orb.radius + PARAMS.orb.motionRadiusBoost).toFixed(4)}, speedNorm);
  float plasmaNoise = fbm(stretched * 12.5 + direction * (uTime * 1.4) + vec2(0.0, -uTime * 0.32));
  float shellNoise = fbm(stretched * 21.0 - direction * (uTime * 1.8) + tangent * uTime * 0.9);
  float surfaceNoise = mix(plasmaNoise, shellNoise, 0.55);
  float shellDistortion = (surfaceNoise - 0.5) * radius * 0.42;

  float radialDistance = length(stretched);
  float core = falloff(radialDistance, radius * 0.02, radius * 0.62);
  float plasmaShell = falloff(radialDistance - shellDistortion * 0.2, radius * 0.12, radius * 1.14 + shellDistortion);
  float hotShell = falloff(abs(radialDistance - radius * (0.78 + shellDistortion * 1.1)), 0.0, radius * 0.36);
  float outerBloom = exp(-(radialDistance * radialDistance) / max(radius * radius * ${PARAMS.orb.glowRadius.toFixed(4)}, 0.000001));
  float wideBloom = exp(-(radialDistance * radialDistance) / max(radius * radius * ${PARAMS.orb.wideGlowRadius.toFixed(4)}, 0.000001));

  float angle = atan(stretched.y, stretched.x);
  float arcPattern = sin(angle * 9.0 - uTime * 7.8 + shellNoise * 8.0) * 0.5 + 0.5;
  float coronaBand = abs(radialDistance - radius * (1.02 + (surfaceNoise - 0.5) * 0.75));
  float corona = falloff(coronaBand, 0.0, radius * 0.26) * pow(arcPattern, 2.0);

  float electricRipples = sin((dot(stretched, direction) * 78.0) - uTime * 16.0 + plasmaNoise * 10.0) * 0.5 + 0.5;
  float electricRim = falloff(abs(radialDistance - radius * (0.92 + shellNoise * 0.08)), 0.0, radius * 0.14);
  float arcs = electricRim * pow(electricRipples, 4.0) * mix(0.55, 1.0, speedNorm);

  vec2 highlightOffset = vec2(-0.32, -0.28) * radius;
  float highlight = exp(-dot(stretched - highlightOffset, stretched - highlightOffset) / max(radius * radius * 0.24, 0.00001));

  vec3 orbColor = vec3(0.0);
  orbColor += vec3(0.04, 0.13, 0.32) * wideBloom * ${PARAMS.orb.wideGlowIntensity.toFixed(3)};
  orbColor += vec3(0.16, 0.14, 0.52) * wideBloom * ${PARAMS.orb.wideGlowVioletIntensity.toFixed(3)};
  orbColor += vec3(0.07, 0.24, 0.58) * outerBloom * ${PARAMS.orb.outerGlowIntensity.toFixed(3)};
  orbColor += vec3(0.14, 0.58, 1.05) * plasmaShell * ${PARAMS.orb.plasmaShellIntensity.toFixed(3)};
  orbColor += vec3(0.55, 0.8, 1.4) * hotShell * ${PARAMS.orb.hotShellIntensity.toFixed(3)};
  orbColor += vec3(0.24, 0.2, 0.9) * corona * ${PARAMS.orb.coronaVioletIntensity.toFixed(3)};
  orbColor += vec3(0.7, 0.92, 1.5) * corona * ${PARAMS.orb.coronaIntensity.toFixed(3)};
  orbColor += vec3(0.9, 0.97, 1.35) * arcs * ${PARAMS.orb.arcIntensity.toFixed(3)};
  orbColor += vec3(0.95, 1.0, 1.0) * core * ${PARAMS.orb.coreIntensity.toFixed(3)};
  orbColor += vec3(1.2, 1.24, 1.3) * highlight * ${PARAMS.orb.highlightIntensity.toFixed(3)};

  float vaporBand = falloff(abs(radialDistance - radius * (1.34 + plasmaNoise * 0.22)), 0.0, radius * 0.5);
  orbColor += vec3(0.18, 0.32, 0.8) * vaporBand * ${PARAMS.orb.vaporIntensity.toFixed(3)};

  float vignette = 1.0 - smoothstep(0.18, 0.95, length(centeredUv * vec2(aspect, 1.0)));
  backgroundColor *= mix(0.6, 1.0, vignette);

  vec3 emission = (tailColor + orbColor + vec3(0.012, 0.036, 0.08) * tailMist) * uOrbOpacity;
  vec3 composed = backgroundColor * uBgMix + emission;
  vec3 mapped = 1.0 - exp(-composed);
  mapped = pow(mapped, vec3(0.9));

  float alpha = 1.0;
  if (uBgMix < 0.5) {
    alpha = saturate(max(max(mapped.r, mapped.g), mapped.b) * 1.18);
  }

  gl_FragColor = vec4(mapped, alpha);
}
`;

function createShader(context, type, source) {
  const shader = context.createShader(type);
  context.shaderSource(shader, source);
  context.compileShader(shader);

  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const info = context.getShaderInfoLog(shader);
    context.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }

  return shader;
}

function createProgram(context, vertexSource, fragmentSource) {
  const vertexShader = createShader(context, context.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentSource);
  const program = context.createProgram();

  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);

  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    const info = context.getProgramInfoLog(program);
    context.deleteProgram(program);
    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);
    throw new Error(`Program link failed: ${info}`);
  }

  context.deleteShader(vertexShader);
  context.deleteShader(fragmentShader);

  return program;
}

function createRenderer(targetCanvas, alpha) {
  const context = targetCanvas.getContext("webgl", {
    alpha,
    antialias: true,
    depth: false,
    stencil: false,
    powerPreference: PARAMS.renderer.powerPreference,
    premultipliedAlpha: alpha,
  });

  if (!context) {
    return null;
  }

  const program = createProgram(context, vertexShaderSource, fragmentShaderSource);
  const quadBuffer = context.createBuffer();

  context.bindBuffer(context.ARRAY_BUFFER, quadBuffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]),
    context.STATIC_DRAW
  );

  return {
    canvas: targetCanvas,
    gl: context,
    program,
    quadBuffer,
    positionLocation: context.getAttribLocation(program, "aPosition"),
    uniforms: {
      resolution: context.getUniformLocation(program, "uResolution"),
      time: context.getUniformLocation(program, "uTime"),
      orb: context.getUniformLocation(program, "uOrb"),
      velocity: context.getUniformLocation(program, "uVelocity"),
      speed: context.getUniformLocation(program, "uSpeed"),
      trail: context.getUniformLocation(program, "uTrail[0]"),
      bgTop: context.getUniformLocation(program, "uBgTop"),
      bgBottom: context.getUniformLocation(program, "uBgBottom"),
      bgMix: context.getUniformLocation(program, "uBgMix"),
      orbOpacity: context.getUniformLocation(program, "uOrbOpacity"),
    },
  };
}

const backRenderer = createRenderer(backCanvas, false);
const frontRenderer = createRenderer(frontCanvas, true);

if (!backRenderer || !frontRenderer) {
  fallbackMessage.hidden = false;
  throw new Error("WebGL is not available in this browser.");
}

const backgroundColors = readBackgroundColors();
const trailUniformData = new Float32Array(MAX_TRAIL_POINTS * FLOATS_PER_POINT);

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  time: 0,
  lastTime: 0,
  pointer: {
    active: false,
    locked: false,
    x: 0,
    y: 0,
  },
  orb: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  },
  visualMotion: {
    vx: 0,
    vy: 0,
    speed: 0,
  },
  trail: [],
  earth: {
    centerX: 0,
    centerY: 0,
    radius: 0,
  },
  render: {
    backOrbOpacity: 1,
    frontOrbOpacity: 0,
  },
  brand: {
    logoWidth: 0,
    logoBaseHeight: 0,
    wordmarkWidth: 0,
    postRevealStart: null,
  },
  sequence: {
    preloadStarted: false,
    earthLoaded: false,
    interactionSatisfied: false,
    revealStarted: false,
    revealStartTime: 0,
    phase: "mouse-follow",
    phaseTime: 0,
    approachStart: null,
    finished: false,
    finishedTime: 0,
    homepageRequested: false,
  },
};

function initializeTrail() {
  state.trail = Array.from({ length: MAX_TRAIL_POINTS }, () => ({
    x: state.orb.x,
    y: state.orb.y,
  }));
}

function updateEarthMetrics() {
  const rect = earthImage.getBoundingClientRect();
  state.earth.centerX = rect.left + rect.width * 0.5;
  state.earth.centerY = rect.top + rect.height * 0.5;
  state.earth.radius = Math.min(rect.width, rect.height) * PARAMS.earth.radiusMultiplier;
}

function fitTextToWidth(element, targetWidth, minSize, maxSize) {
  let low = minSize;
  let high = maxSize;
  let best = minSize;

  for (let iteration = 0; iteration < 18; iteration += 1) {
    const mid = (low + high) * 0.5;
    element.style.fontSize = `${mid}px`;
    const measuredWidth = element.getBoundingClientRect().width;

    if (measuredWidth <= targetWidth) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  element.style.fontSize = `${best}px`;
}

function updateBrandLayout() {
  const logoWidth = clamp(PARAMS.brand.logoFinalWidth, 120, state.width - 48);
  const width = clamp(state.width - 40, PARAMS.brand.minWidth, PARAMS.brand.maxWidth);
  const logoAspectRatio = brandLogo.naturalWidth > 0 && brandLogo.naturalHeight > 0
    ? brandLogo.naturalHeight / brandLogo.naturalWidth
    : 1;

  state.brand.logoWidth = logoWidth;
  state.brand.logoBaseHeight = logoWidth * logoAspectRatio;
  state.brand.wordmarkWidth = width;
  brandLogo.style.width = `${logoWidth}px`;
  brandWordmark.style.width = `${width}px`;

  fitTextToWidth(brandLineTop, width, 1, PARAMS.brand.topFontSize);
  fitTextToWidth(brandLineBottom, width, 1, PARAMS.brand.bottomFontSize);
}

function getPostRevealProgress() {
  if (!state.sequence.finished) {
    return 0;
  }

  const elapsed = Math.max(state.time - state.sequence.finishedTime, 0);
  const pauseDuration = PARAMS.brand.postReveal.pauseDuration;
  const transitionDuration = Math.max(PARAMS.brand.postReveal.transitionDuration, 0.0001);

  if (elapsed <= pauseDuration) {
    return 0;
  }

  return clamp((elapsed - pauseDuration) / transitionDuration, 0, 1);
}

function capturePostRevealStart() {
  if (state.brand.postRevealStart) {
    return state.brand.postRevealStart;
  }

  const wordmarkScale = Math.max(PARAMS.brand.wordmarkScaleEnd, 0.0001);
  const logoRect = brandLogo.getBoundingClientRect();
  const wordmarkRect = brandWordmark.getBoundingClientRect();
  const lineTopRect = brandLineTop.getBoundingClientRect();
  const lineBottomRect = brandLineBottom.getBoundingClientRect();

  state.brand.postRevealStart = {
    logoLeft: logoRect.left,
    logoTop: logoRect.top,
    logoScale: PARAMS.brand.logoScaleEnd,
    logoBaseHeight: Math.max(state.brand.logoBaseHeight, logoRect.height),
    wordmarkLeft: wordmarkRect.left,
    wordmarkTop: wordmarkRect.top,
    wordmarkScale: PARAMS.brand.wordmarkScaleEnd,
    wordmarkBaseWidth: Math.max(lineTopRect.width, lineBottomRect.width) / wordmarkScale,
    wordmarkBaseHeight: wordmarkRect.height / wordmarkScale,
  };

  return state.brand.postRevealStart;
}

function navigateToHomepage() {
  if (state.sequence.homepageRequested) {
    return;
  }

  state.sequence.homepageRequested = true;

  try {
    window.sessionStorage.setItem(
      HOME_LOCKUP_STORAGE_KEY,
      JSON.stringify({
        logoStyle: brandLogo.style.cssText,
        wordmarkStyle: brandWordmark.style.cssText,
        lineTopStyle: brandLineTop.style.cssText,
        lineBottomStyle: brandLineBottom.style.cssText,
      })
    );
  } catch (error) {
    console.warn("Unable to persist Clairiva home lockup.", error);
  }

  window.location.replace(PARAMS.brand.postReveal.homepageUrl);
}

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, PARAMS.renderer.maxDpr);
  state.width = window.innerWidth;
  state.height = window.innerHeight;

  for (const renderer of [backRenderer, frontRenderer]) {
    renderer.canvas.width = Math.round(state.width * state.dpr);
    renderer.canvas.height = Math.round(state.height * state.dpr);
    renderer.gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height);
  }

  if (!state.pointer.active && state.orb.x === 0 && state.orb.y === 0) {
    state.pointer.x = state.width * 0.5;
    state.pointer.y = state.height * 0.5;
    state.orb.x = state.pointer.x;
    state.orb.y = state.pointer.y;
    initializeTrail();
  }

  updateEarthMetrics();
  updateBrandLayout();
}

function startEarthPreload() {
  if (state.sequence.preloadStarted) {
    return;
  }

  state.sequence.preloadStarted = true;
  const source = earthImage.dataset.src;

  if (!source) {
    state.sequence.earthLoaded = true;
    return;
  }

  earthImage.addEventListener(
    "load",
    () => {
      state.sequence.earthLoaded = true;
    },
    { once: true }
  );

  earthImage.src = source;

  if (earthImage.complete) {
    state.sequence.earthLoaded = true;
  }
}

function registerInteraction() {
  state.sequence.interactionSatisfied = true;
}

function bindEvents() {
  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", (event) => {
    if (state.pointer.locked) {
      return;
    }

    state.pointer.active = true;
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
  });

  window.addEventListener("pointerleave", () => {
    if (state.pointer.locked) {
      return;
    }

    state.pointer.active = false;
  });

  window.addEventListener("pointerdown", (event) => {
    registerInteraction();

    if (state.pointer.locked) {
      return;
    }

    state.pointer.active = true;
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
  });

  window.addEventListener("touchstart", registerInteraction, { passive: true });
  window.addEventListener("keydown", registerInteraction);
}

function getViewportRayPoint(angleDegrees) {
  const radians = (angleDegrees * Math.PI) / 180;
  const centerX = state.width * 0.5;
  const centerY = state.height * 0.5;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  const candidates = [];

  if (Math.abs(dx) > 0.0001) {
    candidates.push(((dx > 0 ? state.width : 0) - centerX) / dx);
  }

  if (Math.abs(dy) > 0.0001) {
    candidates.push(((dy > 0 ? state.height : 0) - centerY) / dy);
  }

  const valid = candidates.filter((value) => value > 0);
  const distance = valid.length > 0 ? Math.min(...valid) : 0;
  const inset = PARAMS.sequence.edgeInset;

  return {
    x: clamp(centerX + dx * distance, inset, state.width - inset),
    y: clamp(centerY + dy * distance, inset, state.height - inset),
  };
}

function getOrbitAnchors() {
  updateEarthMetrics();

  // Screen-space Y increases downward, so southwest is 135deg here.
  const swEdge = getViewportRayPoint(135);
  const neEdge = getViewportRayPoint(315);
  const radius = state.earth.radius;
  const centerX = state.earth.centerX;
  const centerY = state.earth.centerY;
  const swOrbit = {
    x: centerX - radius * 1.48,
    y: centerY + radius * 1.08,
  };
  const neOrbit = {
    x: centerX + radius * 1.52,
    y: centerY - radius * 1.04,
  };
  const finalFadeTarget = {
    x: centerX + radius * 0.06,
    y: centerY - radius * 0.08,
  };
  const frontReturnPoint = {
    x: centerX - radius * 0.22,
    y: centerY + radius * 0.26,
  };

  return {
    swEdge,
    neEdge,
    swOrbit,
    neOrbit,
    frontReturnPoint,
    finalFadeTarget,
    frontControls: [
      { x: centerX - radius * 0.94, y: centerY + radius * 0.86 },
      { x: centerX + radius * 0.04, y: centerY - radius * 0.76 },
    ],
    backControls: [
      { x: centerX + radius * 1.7, y: centerY - radius * 1.34 },
      { x: centerX - radius * 1.45, y: centerY + radius * 1.34 },
    ],
    finalControls: [
      { x: centerX - radius * 0.04, y: centerY + radius * 0.02 },
      { x: centerX + radius * 0.36, y: centerY - radius * 0.2 },
    ],
    reentryControls: [
      { x: centerX - radius * 0.98, y: centerY + radius * 0.72 },
      { x: centerX - radius * 0.52, y: centerY + radius * 0.46 },
    ],
  };
}

function setOrbPosition(point, previousX, previousY, dt) {
  state.orb.x = point.x;
  state.orb.y = point.y;
  state.orb.vx = (state.orb.x - previousX) / Math.max(dt, 0.0001);
  state.orb.vy = (state.orb.y - previousY) / Math.max(dt, 0.0001);
}

function getBrandRevealProgress() {
  if (state.sequence.phase === "front-return") {
    const metrics = getFinalSwoopMetrics(getOrbitAnchors());
    return easeOutCubic(clamp(state.sequence.phaseTime / metrics.frontReturnDuration, 0, 1)) * 0.52;
  }

  if (state.sequence.phase === "final-front-pass") {
    const metrics = getFinalSwoopMetrics(getOrbitAnchors());
    const phaseProgress = easeOutCubic(clamp(state.sequence.phaseTime / metrics.finalPassDuration, 0, 1));
    return lerp(0.52, 1, phaseProgress);
  }

  if (state.sequence.finished) {
    return 1;
  }

  return 0;
}

function updateSceneVisuals() {
  let earthOpacity = 0;
  let earthScale = PARAMS.earth.scaleStart;

  if (state.sequence.revealStarted) {
    const progress = clamp(
      (state.time - state.sequence.revealStartTime) / PARAMS.sequence.earthFadeDuration,
      0,
      1
    );
    earthOpacity = easeOutCubic(progress);
    earthScale = lerp(PARAMS.earth.scaleStart, PARAMS.earth.scaleEnd, easeOutCubic(progress));
  }

  const brandProgress = getBrandRevealProgress();
  earthOpacity = lerp(earthOpacity, 0, brandProgress);
  earthScale = lerp(earthScale, 0.84, brandProgress);

  const logoOpacity = easeOutCubic(applySpeedMultiplier(brandProgress, PARAMS.brand.logoFadeInSpeed));
  const logoScale = lerp(PARAMS.brand.logoScaleStart, PARAMS.brand.logoScaleEnd, logoOpacity);
  const wordmarkOpacity = easeOutCubic(
    applySpeedMultiplier(clamp((brandProgress - 0.18) / 0.82, 0, 1), PARAMS.brand.wordmarkFadeInSpeed)
  );
  const wordmarkScale = lerp(
    PARAMS.brand.wordmarkScaleStart,
    PARAMS.brand.wordmarkScaleEnd,
    easeOutCubic(brandProgress)
  );
  const wordmarkStartX = PARAMS.brand.wordmarkStartOffset.x * state.earth.radius + PARAMS.brand.wordmarkOffsetX;
  const wordmarkStartY = PARAMS.brand.wordmarkStartOffset.y * state.earth.radius;
  const wordmarkEndX = PARAMS.brand.wordmarkEndOffset.x * state.earth.radius + PARAMS.brand.wordmarkOffsetX;
  const wordmarkEndY = PARAMS.brand.wordmarkEndOffset.y * state.earth.radius;
  const wordmarkX = lerp(wordmarkStartX, wordmarkEndX, easeOutCubic(brandProgress));
  const wordmarkY = lerp(wordmarkStartY, wordmarkEndY, easeOutCubic(brandProgress));

  brandWash.style.opacity = brandProgress.toFixed(3);
  earthImage.style.opacity = earthOpacity.toFixed(3);
  earthImage.style.transform = `scale(${earthScale.toFixed(3)})`;
  brandLogo.style.opacity = logoOpacity.toFixed(3);
  brandLogo.style.transform =
    `translate(-50%, -50%) translate(${PARAMS.brand.logoOffsetX.toFixed(1)}px, ${PARAMS.brand.logoOffsetY.toFixed(1)}px) scale(${logoScale.toFixed(3)})`;
  brandWordmark.style.opacity = wordmarkOpacity.toFixed(3);
  brandWordmark.style.transform =
    `translate(-50%, 0) translate(${wordmarkX.toFixed(1)}px, ${wordmarkY.toFixed(1)}px) scale(${wordmarkScale.toFixed(3)})`;
  frontCanvas.style.mixBlendMode = brandProgress > 0.08 ? "normal" : "screen";
  frontCanvas.style.filter = brandProgress > 0.08 ? "none" : "brightness(1.28) saturate(1.12)";

  if (!state.sequence.finished) {
    return;
  }

  const postReveal = capturePostRevealStart();
  const dockProgress = easeInOutCubic(getPostRevealProgress());
  const logoTargetScale = PARAMS.brand.postReveal.logoTargetHeight / Math.max(postReveal.logoBaseHeight, 0.0001);
  const wordmarkTargetScale =
    PARAMS.brand.postReveal.wordmarkTargetHeight / Math.max(postReveal.wordmarkBaseHeight, 0.0001);

  brandLogo.style.left = `${lerp(postReveal.logoLeft, PARAMS.brand.postReveal.logoTargetLeft, dockProgress).toFixed(1)}px`;
  brandLogo.style.top = `${lerp(postReveal.logoTop, PARAMS.brand.postReveal.logoTargetTop, dockProgress).toFixed(1)}px`;
  brandLogo.style.width = `${state.brand.logoWidth}px`;
  brandLogo.style.height = `${postReveal.logoBaseHeight}px`;
  brandLogo.style.transformOrigin = "top left";
  brandLogo.style.transform = `scale(${lerp(postReveal.logoScale, logoTargetScale, dockProgress).toFixed(3)})`;

  brandWordmark.style.left =
    `${lerp(postReveal.wordmarkLeft, PARAMS.brand.postReveal.wordmarkTargetLeft, dockProgress).toFixed(1)}px`;
  brandWordmark.style.top =
    `${lerp(postReveal.wordmarkTop, PARAMS.brand.postReveal.wordmarkTargetTop, dockProgress).toFixed(1)}px`;
  brandWordmark.style.width = `${postReveal.wordmarkBaseWidth}px`;
  brandWordmark.style.transformOrigin = "top left";
  brandWordmark.style.textAlign = "left";
  brandWordmark.style.transform =
    `scale(${lerp(postReveal.wordmarkScale, wordmarkTargetScale, dockProgress).toFixed(3)})`;

  if (dockProgress >= 1) {
    navigateToHomepage();
  }
}

function maybeStartReveal() {
  if (state.sequence.revealStarted) {
    return;
  }

  const enoughTimeElapsed = state.time >= PARAMS.sequence.earthDelaySeconds;

  if (!state.sequence.earthLoaded || (!enoughTimeElapsed && !state.sequence.interactionSatisfied)) {
    return;
  }

  state.sequence.revealStarted = true;
  state.sequence.revealStartTime = state.time;
  state.sequence.phase = "approach";
  state.sequence.phaseTime = 0;
  state.sequence.approachStart = {
    x: state.orb.x,
    y: state.orb.y,
  };
  state.pointer.locked = true;
  state.pointer.active = false;
}

function updateScriptedMotion(dt, previousX, previousY) {
  const anchors = getOrbitAnchors();
  const finalSwoop = getFinalSwoopMetrics(anchors);
  const radius = state.earth.radius;
  state.sequence.phaseTime += dt;

  if (state.sequence.phase === "approach") {
    const progress = clamp(state.sequence.phaseTime / PARAMS.sequence.approachDuration, 0, 1);
    const eased = easeInOutCubic(progress);
    const start = state.sequence.approachStart;
    const target = anchors.swEdge;
    const controlA = {
      x: lerp(start.x, state.width * 0.34, 0.48),
      y: lerp(start.y, state.height * 0.46, 0.48),
    };
    const controlB = {
      x: state.earth.centerX - radius * 1.6,
      y: state.earth.centerY + radius * 1.45,
    };

    setOrbPosition(cubicBezier(start, controlA, controlB, target, eased), previousX, previousY, dt);
    state.render.backOrbOpacity = 1;
    state.render.frontOrbOpacity = 0;

    if (progress >= 1) {
      state.sequence.phase = "front-pass";
      state.sequence.phaseTime = 0;
    }

    return;
  }

  if (state.sequence.phase === "front-pass") {
    const progress = clamp(state.sequence.phaseTime / PARAMS.sequence.frontArcDuration, 0, 1);
    const eased = easeInOutSine(progress);
    const point = cubicBezier(
      anchors.swEdge,
      anchors.frontControls[0],
      anchors.frontControls[1],
      anchors.neOrbit,
      eased
    );

    setOrbPosition(point, previousX, previousY, dt);
    state.render.backOrbOpacity = PARAMS.layers.frontBackfillOpacity;
    state.render.frontOrbOpacity = PARAMS.layers.frontOverlayOpacity;

    if (progress >= 1) {
      state.sequence.phase = "back-pass";
      state.sequence.phaseTime = 0;
    }

    return;
  }

  if (state.sequence.phase === "back-pass") {
    const progress = clamp(state.sequence.phaseTime / PARAMS.sequence.backArcDuration, 0, 1);
    const eased = easeInOutSine(progress);
    const point = cubicBezier(
      anchors.neOrbit,
      anchors.backControls[0],
      anchors.backControls[1],
      anchors.swOrbit,
      eased
    );

    setOrbPosition(point, previousX, previousY, dt);
    state.render.backOrbOpacity = PARAMS.layers.backPassOpacity;
    state.render.frontOrbOpacity = 0;

    if (progress >= 1) {
      state.sequence.phase = "front-return";
      state.sequence.phaseTime = 0;
    }

    return;
  }

  if (state.sequence.phase === "front-return") {
    const progress = clamp(state.sequence.phaseTime / finalSwoop.frontReturnDuration, 0, 1);
    const fade = 1 - applySpeedMultiplier(
      state.sequence.phaseTime / finalSwoop.totalDuration,
      PARAMS.sequence.cometFadeOutSpeed
    );
    const point = sampleArcTable(finalSwoop.frontReturnArc, progress);

    setOrbPosition(point, previousX, previousY, dt);
    state.render.backOrbOpacity = PARAMS.layers.frontBackfillOpacity * 0.15 * fade;
    state.render.frontOrbOpacity = PARAMS.layers.frontOverlayOpacity * 1.22 * fade;

    if (progress >= 1) {
      state.sequence.phase = "final-front-pass";
      state.sequence.phaseTime = 0;
    }

    return;
  }

  if (state.sequence.phase === "final-front-pass") {
    const progress = clamp(state.sequence.phaseTime / finalSwoop.finalPassDuration, 0, 1);
    const elapsed = finalSwoop.frontReturnDuration + state.sequence.phaseTime;
    const fade = 1 - applySpeedMultiplier(
      elapsed / finalSwoop.totalDuration,
      PARAMS.sequence.cometFadeOutSpeed
    );
    const point = mixPoint(
      anchors.frontReturnPoint,
      anchors.neEdge,
      progress
    );

    setOrbPosition(point, previousX, previousY, dt);
    state.render.backOrbOpacity = PARAMS.layers.frontBackfillOpacity * 0.35 * fade;
    state.render.frontOrbOpacity = PARAMS.layers.frontOverlayOpacity * 1.18 * fade;

    if (progress >= 1) {
      state.sequence.phase = "done";
      state.sequence.phaseTime = 0;
      state.sequence.finished = true;
      state.sequence.finishedTime = state.time;
    }

    return;
  }

  state.orb.vx = lerp(state.orb.vx, 0, clamp(dt * 8, 0.08, 0.22));
  state.orb.vy = lerp(state.orb.vy, 0, clamp(dt * 8, 0.08, 0.22));
  state.render.backOrbOpacity = 0;
  state.render.frontOrbOpacity = 0;
}

function updateTrail(dt, motion) {
  const headResponse = clamp(
    PARAMS.trail.headResponseBase +
      motion * PARAMS.trail.headResponseMotionBoost +
      dt * PARAMS.trail.headResponseDtScale,
    PARAMS.trail.headResponseMin,
    PARAMS.trail.headResponseMax
  );

  state.trail[0].x = lerp(state.trail[0].x, state.orb.x, headResponse);
  state.trail[0].y = lerp(state.trail[0].y, state.orb.y, headResponse);

  for (let index = 1; index < state.trail.length; index += 1) {
    const previous = state.trail[index - 1];
    const point = state.trail[index];
    const delay = clamp(
      PARAMS.trail.segmentDelayBase -
        index * PARAMS.trail.segmentDelayIndexFalloff +
        motion * PARAMS.trail.segmentDelayMotionBoost +
        dt * PARAMS.trail.segmentDelayDtScale,
      PARAMS.trail.segmentDelayMin,
      PARAMS.trail.segmentDelayMax
    );

    point.x = lerp(point.x, previous.x, delay);
    point.y = lerp(point.y, previous.y, delay);
  }
}

function update(dt) {
  state.time += dt;
  updateSceneVisuals();
  maybeStartReveal();

  const idleX = state.width * 0.5 + Math.cos(state.time * PARAMS.idle.xFrequency) * state.width * PARAMS.idle.xAmplitude;
  const idleY = state.height * 0.5 + Math.sin(state.time * PARAMS.idle.yFrequency) * state.height * PARAMS.idle.yAmplitude;
  const targetX = state.pointer.active ? state.pointer.x : idleX;
  const targetY = state.pointer.active ? state.pointer.y : idleY;
  const previousX = state.orb.x;
  const previousY = state.orb.y;

  if (state.sequence.revealStarted) {
    updateScriptedMotion(dt, previousX, previousY);
  } else if (state.pointer.active) {
    state.orb.x = targetX;
    state.orb.y = targetY;

    const velocityBlend = clamp(
      1 - Math.exp(-dt * PARAMS.motion.velocitySmoothing),
      PARAMS.motion.velocitySmoothingMin,
      PARAMS.motion.velocitySmoothingMax
    );
    const instantVx = (state.orb.x - previousX) / Math.max(dt, 0.0001);
    const instantVy = (state.orb.y - previousY) / Math.max(dt, 0.0001);
    const instantSpeed = Math.hypot(instantVx, instantVy);
    const limitedSpeed = Math.min(instantSpeed, PARAMS.motion.visualSpeedClamp);
    const scale = instantSpeed > 0 ? limitedSpeed / instantSpeed : 1;

    state.orb.vx = lerp(state.orb.vx, instantVx * scale, velocityBlend);
    state.orb.vy = lerp(state.orb.vy, instantVy * scale, velocityBlend);
    state.render.backOrbOpacity = 1;
    state.render.frontOrbOpacity = 0;
  } else {
    const stiffness = PARAMS.follow.stiffness;
    const damping = PARAMS.follow.damping;
    const dx = targetX - state.orb.x;
    const dy = targetY - state.orb.y;

    state.orb.vx += (dx * stiffness - state.orb.vx * damping) * dt;
    state.orb.vy += (dy * stiffness - state.orb.vy * damping) * dt;
    state.orb.x += state.orb.vx * dt;
    state.orb.y += state.orb.vy * dt;
    state.render.backOrbOpacity = 1;
    state.render.frontOrbOpacity = 0;
  }

  const speed = Math.hypot(state.orb.vx, state.orb.vy);
  const motionBlend = clamp(
    1 - Math.exp(-dt * PARAMS.motion.visualMotionSmoothing),
    PARAMS.motion.visualMotionSmoothingMin,
    PARAMS.motion.visualMotionSmoothingMax
  );

  state.visualMotion.vx = lerp(state.visualMotion.vx, state.orb.vx, motionBlend);
  state.visualMotion.vy = lerp(state.visualMotion.vy, state.orb.vy, motionBlend);
  state.visualMotion.speed = lerp(state.visualMotion.speed, speed, motionBlend);

  const motion = clamp(state.visualMotion.speed / PARAMS.trail.motionScale, 0, 1);
  updateTrail(dt, motion);
}

function uploadTrail() {
  for (let index = 0; index < MAX_TRAIL_POINTS; index += 1) {
    const point = state.trail[index];
    const offset = index * FLOATS_PER_POINT;
    const age = index / Math.max(MAX_TRAIL_POINTS - 1, 1);
    const strength = Math.pow(1 - age, 1.2);

    trailUniformData[offset] = point.x * state.dpr;
    trailUniformData[offset + 1] = point.y * state.dpr;
    trailUniformData[offset + 2] = strength;
    trailUniformData[offset + 3] = age;
  }
}

function renderScene(renderer, backgroundMix, orbOpacity) {
  const { gl, program, quadBuffer, positionLocation, uniforms } = renderer;

  if (backgroundMix > 0.5) {
    gl.clearColor(0, 0, 0, 1);
  } else {
    gl.clearColor(0, 0, 0, 0);
  }

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(uniforms.resolution, renderer.canvas.width, renderer.canvas.height);
  gl.uniform1f(uniforms.time, state.time);
  gl.uniform2f(uniforms.orb, state.orb.x * state.dpr, state.orb.y * state.dpr);
  gl.uniform2f(
    uniforms.velocity,
    state.visualMotion.vx * state.dpr,
    state.visualMotion.vy * state.dpr
  );
  gl.uniform1f(uniforms.speed, state.visualMotion.speed * state.dpr);
  gl.uniform4fv(uniforms.trail, trailUniformData);
  gl.uniform3fv(uniforms.bgTop, backgroundColors.top);
  gl.uniform3fv(uniforms.bgBottom, backgroundColors.bottom);
  gl.uniform1f(uniforms.bgMix, backgroundMix);
  gl.uniform1f(uniforms.orbOpacity, orbOpacity);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function render() {
  uploadTrail();
  renderScene(backRenderer, 1, state.render.backOrbOpacity);
  renderScene(frontRenderer, 0, state.render.frontOrbOpacity);
}

function animate(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  if (!state.sequence.preloadStarted) {
    startEarthPreload();
  }

  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
  state.lastTime = timestamp;

  update(dt);
  render();
  window.requestAnimationFrame(animate);
}

resize();

if (state.trail.length === 0) {
  initializeTrail();
}

bindEvents();
window.requestAnimationFrame(animate);
