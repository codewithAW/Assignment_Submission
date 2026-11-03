import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ParticleField: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 35;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Particle Setup with InstancedMesh (Efficient single draw call)
    const particleCount = 450;
    const geometry = new THREE.OctahedronGeometry(0.12, 0);

    // Subtle cyan-to-violet academic particle theme
    const material = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);

    // Store base positions, velocity and phase for organic compiler network motion
    const dummy = new THREE.Object3D();
    const positions: { x: number; y: number; z: number; baseX: number; baseY: number; phase: number; speed: number }[] = [];
    const colors: THREE.Color[] = [];
    const cyan = new THREE.Color('#38bdf8');
    const violet = new THREE.Color('#a855f7');
    const indigo = new THREE.Color('#6366f1');

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 45;
      const z = (Math.random() - 0.5) * 30;

      positions.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.4,
      });

      // Random gradient accent
      const mixRatio = Math.random();
      const col = mixRatio < 0.5 ? cyan.clone().lerp(violet, mixRatio * 2) : violet.clone().lerp(indigo, (mixRatio - 0.5) * 2);
      colors.push(col);
      instancedMesh.setColorAt(i, col);
    }
    instancedMesh.instanceColor!.needsUpdate = true;
    scene.add(instancedMesh);

    // Mouse Tracking for Cursor-Responsive Wave & Repulsion
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      // Convert to -1 to +1 range
      mouse.targetX = ((clientX / rect.width) * 2 - 1) * 20;
      mouse.targetY = (-(clientY / rect.height) * 2 + 1) * 15;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      for (let i = 0; i < particleCount; i++) {
        const p = positions[i];

        // Harmonic wave oscillation
        const waveX = Math.sin(elapsedTime * p.speed + p.phase) * 0.8;
        const waveY = Math.cos(elapsedTime * p.speed * 0.8 + p.phase) * 0.8;

        // Interactive Cursor repulsion / attraction
        const dx = (p.baseX + waveX) - mouse.x;
        const dy = (p.baseY + waveY) - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let pushX = 0;
        let pushY = 0;
        if (dist < 8) {
          const force = (1 - dist / 8) * 2.2;
          pushX = (dx / (dist + 0.001)) * force;
          pushY = (dy / (dist + 0.001)) * force;
        }

        dummy.position.set(
          p.baseX + waveX + pushX,
          p.baseY + waveY + pushY,
          p.z + Math.sin(elapsedTime * 0.5 + p.phase) * 0.5
        );

        dummy.rotation.x = elapsedTime * 0.2 + p.phase;
        dummy.rotation.y = elapsedTime * 0.3 + p.phase;

        const scale = 0.8 + Math.sin(elapsedTime * 1.5 + p.phase) * 0.3;
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;

      // Subtle scene tilt
      scene.rotation.y = mouse.x * 0.003;
      scene.rotation.x = -mouse.y * 0.003;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-70"
      aria-hidden="true"
    />
  );
};
