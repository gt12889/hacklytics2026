import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const SILVER = {
  primary: "#C0C0C0",
  light: "#E8E8E8",
  dark: "#808080",
  accent: "#A0D2DB",
  bg: "#0A0E17",
  bgGrad: "#111827",
};

function MedicalEmblem3D() {
  const mountRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.012);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.2, 10);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Environment cubemap for reflections
    const envScene = new THREE.Scene();
    const envCamera = new THREE.CubeCamera(0.1, 100, new THREE.WebGLCubeRenderTarget(256));
    envScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x1a2035, side: THREE.BackSide })
    ));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spot = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      spot.position.set(Math.cos(a) * 25, Math.sin(a * 0.6) * 18, Math.sin(a) * 25);
      envScene.add(spot);
    }
    envCamera.update(renderer, envScene);

    const silverMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0, metalness: 0.95, roughness: 0.12,
      envMap: envCamera.renderTarget.texture, envMapIntensity: 1.8,
    });
    const darkSilverMaterial = new THREE.MeshStandardMaterial({
      color: 0xa0a0a0, metalness: 0.92, roughness: 0.2,
      envMap: envCamera.renderTarget.texture, envMapIntensity: 1.4,
    });
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0xa0d2db, metalness: 0.3, roughness: 0.4,
      emissive: 0xa0d2db, emissiveIntensity: 0.5,
    });

    const emblemGroup = new THREE.Group();

    // ===== THICK CENTRAL ROD =====
    const rodRadius = 0.18;
    const rodHeight = 5.5;
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(rodRadius, rodRadius * 1.1, rodHeight, 24),
      silverMaterial
    );
    rod.castShadow = true;
    emblemGroup.add(rod);

    // Rod top sphere
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), silverMaterial);
    topCap.position.y = rodHeight / 2;
    topCap.castShadow = true;
    emblemGroup.add(topCap);

    // Rod bottom cap
    const bottomCap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), silverMaterial);
    bottomCap.position.y = -rodHeight / 2;
    emblemGroup.add(bottomCap);

    // ===== TWO THICK SNAKES (Caduceus) =====
    function createThickSnake(startAngle, direction) {
      const group = new THREE.Group();
      const coils = 3.0;
      const segments = 300;
      const wrapRadius = 0.6;
      const bodyThickness = 0.11;

      const points = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = startAngle + t * coils * Math.PI * 2 * direction;
        const y = (t - 0.5) * 4.2;
        const r = wrapRadius + Math.sin(t * Math.PI) * 0.18;
        points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
      }

      // Head extends outward
      const last = points[points.length - 1];
      const headDir = direction > 0 ? 1 : -1;
      for (let i = 1; i <= 30; i++) {
        const t = i / 30;
        points.push(new THREE.Vector3(
          last.x + headDir * t * t * 1.3,
          last.y + t * 0.6,
          last.z * (1 - t * 0.5)
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 250, bodyThickness, 14, false), darkSilverMaterial);
      tube.castShadow = true;
      group.add(tube);

      // Head
      const headPos = points[points.length - 1];
      const headGeom = new THREE.SphereGeometry(0.18, 16, 16);
      headGeom.scale(1.8, 1.0, 1.4);
      const head = new THREE.Mesh(headGeom, darkSilverMaterial);
      head.position.copy(headPos);
      head.castShadow = true;
      group.add(head);

      // Eyes
      const eyeG = new THREE.SphereGeometry(0.04, 8, 8);
      [0.13, -0.13].forEach(zOff => {
        const eye = new THREE.Mesh(eyeG, glowMaterial);
        eye.position.set(headPos.x + headDir * 0.1, headPos.y + 0.07, headPos.z + zOff);
        group.add(eye);
      });

      return group;
    }

    emblemGroup.add(createThickSnake(0, 1));
    emblemGroup.add(createThickSnake(Math.PI, -1));

    // ===== THICK DENSE WINGS =====
    function createWing(side) {
      const wingGroup = new THREE.Group();
      const mult = side === "left" ? -1 : 1;
      const layers = [
        { count: 9, zOff: 0, yBase: 2.55, scale: 1.0 },
        { count: 8, zOff: 0.07, yBase: 2.50, scale: 0.9 },
        { count: 6, zOff: 0.14, yBase: 2.45, scale: 0.75 },
      ];

      layers.forEach((layer) => {
        for (let i = 0; i < layer.count; i++) {
          const t = i / (layer.count - 1);
          const length = (0.9 + Math.sin(t * Math.PI) * 1.1) * layer.scale;
          const fw = 0.16 + (1 - Math.abs(t - 0.5) * 2) * 0.12;
          const thickness = 0.05;

          const shape = new THREE.Shape();
          shape.moveTo(0, 0);
          shape.quadraticCurveTo(length * 0.4, fw * 2.8, length, fw * 0.4);
          shape.lineTo(length, -fw * 0.2);
          shape.quadraticCurveTo(length * 0.4, -fw * 1.4, 0, 0);

          const geom = new THREE.ExtrudeGeometry(shape, {
            depth: thickness,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.015,
            bevelSegments: 3,
          });

          const feather = new THREE.Mesh(geom, silverMaterial);
          const spreadAngle = -0.15 + t * 1.4;
          feather.rotation.z = mult > 0 ? Math.PI - spreadAngle : spreadAngle;
          feather.rotation.x = layer.zOff * 1.5;
          feather.position.set(
            mult * 0.28,
            layer.yBase + Math.sin(t * Math.PI) * 0.35 - layer.zOff * 1.0,
            layer.zOff * mult
          );
          feather.castShadow = true;
          wingGroup.add(feather);
        }
      });

      // Wing base connector
      const base = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        silverMaterial
      );
      base.scale.set(1.5, 0.8, 1.2);
      base.position.set(mult * 0.2, 2.45, 0);
      wingGroup.add(base);

      return wingGroup;
    }

    emblemGroup.add(createWing("left"));
    emblemGroup.add(createWing("right"));

    // Collar rings
    for (let i = 0; i < 5; i++) {
      const y = -1.8 + i * 0.9;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 10, 28), silverMaterial);
      collar.position.y = y;
      collar.rotation.x = Math.PI / 2;
      emblemGroup.add(collar);
    }

    scene.add(emblemGroup);

    // Particles
    const pCount = 400;
    const pGeom = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 25;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    pGeom.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeom, new THREE.PointsMaterial({
      color: 0xa0d2db, size: 0.04, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending,
    }));
    scene.add(particles);

    // Lighting
    scene.add(new THREE.AmbientLight(0x404060, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xa0d2db, 0.7);
    fillLight.position.set(-4, 2, -3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xc0c0ff, 1.0);
    rimLight.position.set(0, -3, -6);
    scene.add(rimLight);
    const topLight = new THREE.PointLight(0xffffff, 1.0, 20);
    topLight.position.set(0, 8, 4);
    scene.add(topLight);
    const bottomLight = new THREE.PointLight(0x6080a0, 0.5, 15);
    bottomLight.position.set(0, -6, 3);
    scene.add(bottomLight);

    // Interaction
    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener("mousemove", onMouseMove);

    // Animation
    let frame = 0, animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame++;
      const t = frame * 0.008;
      const tY = mouseX * 0.6, tX = mouseY * 0.35;

      if (autoRotate) {
        emblemGroup.rotation.y += (tY + Math.sin(t * 0.4) * 0.4 - emblemGroup.rotation.y) * 0.025;
      } else {
        emblemGroup.rotation.y += (tY - emblemGroup.rotation.y) * 0.05;
      }
      emblemGroup.rotation.x += (tX - emblemGroup.rotation.x) * 0.05;
      emblemGroup.position.y = Math.sin(t * 0.6) * 0.12;
      particles.rotation.y = t * 0.04;
      particles.rotation.x = t * 0.015;
      glowMaterial.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.25;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [autoRotate]);

  return (
    <div ref={mountRef} style={{
      width: "100%",
      height: "100%",
      cursor: "grab",
      borderRadius: 12,
    }} />
  );
}

export default MedicalEmblem3D;
