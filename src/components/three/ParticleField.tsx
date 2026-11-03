import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

export const ParticleField: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

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

    const isLight = theme === 'light';
    const particleCount = 380;
    const geometry = new THREE.OctahedronGeometry(0.12, 0);

    const material = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284c7 : 0x38bdf8,
      transparent: true,
      opacity: isLight ? 0.35 : 0.65,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);

    const dummy = new THREE.Object3D();
    const positions: { x: number; y: number; z: number; baseX: number; baseY: number; phase: number; speed: number }[] = [];
    
    const colA = isLight ? new THREE.Color('#0284c7') : new THREE.Color('#38bdf8');
    const colB = isLight ? new THREE.Color('#7c3aed') : new THREE.Color('#a855f7');
    const colC = isLight ? new THREE.Color('#475569') : new THREE.Color('#6366f1');

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
        speed: 0.18 + Math.random() * 0.35,
      });

      const mixRatio = Math.random();
      const col = mixRatio < 0.5 
        ? colA.clone().lerp(colB, mixRatio * 2) 
        : colB.clone().lerp(colC, (mixRatio - 0.5) * 2);
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
      mouse.targetX = ((clientX / rect.width) * 2 - 1) * 20;
      mouse.targetY = (-(clientY / rect.height) * 2 + 1) * 15;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      for (let i = 0; i < particleCount; i++) {
        const p = positions[i];
        const waveX = Math.sin(elapsedTime * p.speed + p.phase) * 0.7;
        const waveY = Math.cos(elapsedTime * p.speed * 0.8 + p.phase) * 0.7;

        const dx = (p.baseX + waveX) - mouse.x;
        const dy = (p.baseY + waveY) - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let pushX = 0;
        let pushY = 0;
        if (dist < 8) {
          const force = (1 - dist / 8) * 2.0;
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
      scene.rotation.y = mouse.x * 0.0025;
      scene.rotation.x = -mouse.y * 0.0025;

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
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${
        theme === 'light' ? 'opacity-40' : 'opacity-70'
      }`}
      aria-hidden="true"
    />
  );
};
