'use strict';

(() => {
  const THREE = window.THREE;
  const gsap = window.gsap;
  const container = document.querySelector('#wheel-3d-canvas');
  const cameraButton = document.querySelector('#wheel-3d-camera');

  let available = Boolean(THREE && gsap && container);
  let scene;
  let camera;
  let renderer;
  let resizeObserver;
  let animationFrameId = 0;

  let characterGroup;
  let torso;
  let head;
  let leftLegGroup;
  let rightLegGroup;
  let leftArmGroup;
  let rightArmGroup;
  let wheelGroup;
  let wheelDisc;
  let pointerNeedle;

  let masterTimeline = null;
  let wheelContinuousTween = null;
  let isAnimating = false;
  let currentCamAngleIndex = 0;
  let completionCallback = null;

  const camPresets = [
    { x: 18, y: 18, z: 18, lookX: 0, lookY: 1.2, lookZ: 0 },
    { x: 0, y: 22, z: 18, lookX: 0, lookY: 1.2, lookZ: 0 },
    { x: -18, y: 18, z: 18, lookX: 0, lookY: 1.2, lookZ: 0 }
  ];

  function makeBaguaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512;
    const cy = 512;
    const r = 440;

    ctx.clearRect(0, 0, 1024, 1024);

    ctx.fillStyle = '#fffdfa';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56,67,75,.22)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(160,231,229,.32)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx, cy, 318, 0, Math.PI * 2);
    ctx.stroke();

    // Yin-yang symbol.
    const yr = 145;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#34454b';
    ctx.beginPath();
    ctx.arc(0, 0, yr, Math.PI / 2, Math.PI * 1.5, false);
    ctx.arc(0, -yr / 2, yr / 2, Math.PI * 1.5, Math.PI / 2, true);
    ctx.arc(0, yr / 2, yr / 2, Math.PI * 1.5, Math.PI / 2, false);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fffdfa';
    ctx.beginPath();
    ctx.arc(0, -yr / 2, yr / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#34454b';
    ctx.beginPath();
    ctx.arc(0, yr / 2, yr / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const trigrams = ['☰','☱','☲','☳','☴','☵','☶','☷'];
    ctx.fillStyle = '#43535a';
    ctx.font = '700 82px "Noto Sans Symbols 2", "Segoe UI Symbol", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    trigrams.forEach((symbol, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 4;
      const tx = cx + Math.cos(angle) * 360;
      const ty = cy + Math.sin(angle) * 360;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(symbol, 0, 0);
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
    texture.needsUpdate = true;
    return texture;
  }

  function initScene() {
    if (!available || renderer) return available;

    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#F4F1EA');
      scene.fog = new THREE.FogExp2('#F4F1EA', 0.015);

      const d = 8.5;
      const { width, height } = getSize();
      const aspect = width / height;
      camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

      const preset = camPresets[0];
      camera.position.set(preset.x, preset.y, preset.z);
      camera.lookAt(preset.lookX, preset.lookY, preset.lookZ);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if ('ACESFilmicToneMapping' in THREE) renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      container.replaceChildren(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xfffaed, 1.1);
      dirLight.position.set(15, 25, 12);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 60;
      const shadowD = 12;
      dirLight.shadow.camera.left = -shadowD;
      dirLight.shadow.camera.right = shadowD;
      dirLight.shadow.camera.top = shadowD;
      dirLight.shadow.camera.bottom = -shadowD;
      dirLight.shadow.bias = -0.0005;
      scene.add(dirLight);

      scene.add(new THREE.HemisphereLight(0xa0e7e5, 0xffd3b6, 0.4));

      createStage();
      createCharacter();
      createFortuneWheel();
      createAmbientDecoration();

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      window.addEventListener('resize', resize, { passive: true });
      cameraButton?.addEventListener('click', toggleCameraAngle);

      renderLoop();
      return true;
    } catch (error) {
      console.warn('3D wheel scene could not initialize; draw fallback will be used.', error);
      available = false;
      return false;
    }
  }

  function getSize() {
    const rect = container.getBoundingClientRect();
    return {
      width: Math.max(320, Math.round(rect.width || container.clientWidth || 720)),
      height: Math.max(300, Math.round(rect.height || container.clientHeight || 460))
    };
  }

  function createStage() {
    const stageGroup = new THREE.Group();
    const matBase = new THREE.MeshStandardMaterial({ color: 0xE8E3D9, roughness: 0.6, metalness: 0.1 });
    const matTop = new THREE.MeshStandardMaterial({ color: 0xDCECDA, roughness: 0.5, metalness: 0.1 });
    const matStep = new THREE.MeshStandardMaterial({ color: 0xF7D6C8, roughness: 0.5, metalness: 0.1 });

    const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 7), matBase);
    mainMesh.position.set(0, -0.6, 0);
    mainMesh.receiveShadow = true;
    mainMesh.castShadow = true;
    stageGroup.add(mainMesh);

    const topMesh = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.2, 6.6), matTop);
    topMesh.position.set(0, 0.1, 0);
    topMesh.receiveShadow = true;
    stageGroup.add(topMesh);

    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 4), matStep);
    stepMesh.position.set(-6.5, -0.3, 0);
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    stageGroup.add(stepMesh);

    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 16);
    const matPillar = new THREE.MeshStandardMaterial({ color: 0xDDD7CC, roughness: 0.7 });
    [[-5,-4.6,-2.5],[5,-4.6,-2.5],[-5,-4.6,2.5],[5,-4.6,2.5]].forEach((pos) => {
      const pillar = new THREE.Mesh(pillarGeo, matPillar);
      pillar.position.set(...pos);
      pillar.receiveShadow = true;
      stageGroup.add(pillar);
    });

    scene.add(stageGroup);
  }

  function createCharacter() {
    characterGroup = new THREE.Group();

    const matSkin = new THREE.MeshStandardMaterial({ color: 0xFAF9F5, roughness: 0.4, metalness: 0.05 });
    const matFace = new THREE.MeshBasicMaterial({ color: 0x2C3E50 });
    const matBlush = new THREE.MeshBasicMaterial({ color: 0xFFAAA5 });

    const bodyGroup = new THREE.Group();

    torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.6), matSkin);
    torso.position.y = 0.85;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.85), matSkin);
    head.position.y = 1.75;
    head.castShadow = true;
    head.receiveShadow = true;

    const eyeGeo = new THREE.BoxGeometry(0.1, 0.12, 0.02);
    const leftEye = new THREE.Mesh(eyeGeo, matFace);
    leftEye.position.set(-0.2, 0.05, 0.43);
    const rightEye = new THREE.Mesh(eyeGeo, matFace);
    rightEye.position.set(0.2, 0.05, 0.43);
    head.add(leftEye, rightEye);

    const blushGeo = new THREE.BoxGeometry(0.12, 0.06, 0.02);
    const leftBlush = new THREE.Mesh(blushGeo, matBlush);
    leftBlush.position.set(-0.25, -0.1, 0.43);
    const rightBlush = new THREE.Mesh(blushGeo, matBlush);
    rightBlush.position.set(0.25, -0.1, 0.43);
    head.add(leftBlush, rightBlush);

    bodyGroup.add(head);
    characterGroup.add(bodyGroup);

    const legGeo = new THREE.BoxGeometry(0.25, 0.5, 0.28);
    leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.22, 0.4, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, matSkin);
    leftLegMesh.position.y = -0.25;
    leftLegMesh.castShadow = true;
    leftLegGroup.add(leftLegMesh);
    characterGroup.add(leftLegGroup);

    rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.22, 0.4, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, matSkin);
    rightLegMesh.position.y = -0.25;
    rightLegMesh.castShadow = true;
    rightLegGroup.add(rightLegMesh);
    characterGroup.add(rightLegGroup);

    const armGeo = new THREE.BoxGeometry(0.22, 0.55, 0.22);
    leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.52, 1.2, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, matSkin);
    leftArmMesh.position.y = -0.25;
    leftArmMesh.castShadow = true;
    leftArmGroup.add(leftArmMesh);
    characterGroup.add(leftArmGroup);

    rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.52, 1.2, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, matSkin);
    rightArmMesh.position.y = -0.25;
    rightArmMesh.castShadow = true;
    rightArmGroup.add(rightArmMesh);
    characterGroup.add(rightArmGroup);

    characterGroup.position.set(-4.5, 0.2, 0);
    characterGroup.rotation.y = Math.PI / 2;
    scene.add(characterGroup);
  }

  function createFortuneWheel() {
    wheelGroup = new THREE.Group();
    wheelGroup.position.set(4.0, 0.2, 0);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x4A5568, roughness: 0.4 });
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), baseMat);
    standBase.position.y = 0.15;
    standBase.castShadow = true;
    standBase.receiveShadow = true;
    wheelGroup.add(standBase);

    const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.2, 16), baseMat);
    poleMesh.position.y = 1.7;
    poleMesh.castShadow = true;
    wheelGroup.add(poleMesh);

    const axleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16), baseMat);
    axleMesh.rotation.x = Math.PI / 2;
    axleMesh.position.set(0, 2.7, 0);
    wheelGroup.add(axleMesh);

    wheelDisc = new THREE.Group();
    wheelDisc.position.set(0, 2.7, 0.2);

    const wheelRadius = 1.8;
    const wheelDepth = 0.25;

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelDepth, 64),
      new THREE.MeshStandardMaterial({ color: 0xFFFDF8, roughness: 0.35, metalness: 0.03 })
    );
    disc.rotation.x = Math.PI / 2;
    disc.castShadow = true;
    disc.receiveShadow = true;
    wheelDisc.add(disc);

    const face = new THREE.Mesh(
      new THREE.CircleGeometry(wheelRadius * 0.94, 96),
      new THREE.MeshBasicMaterial({ map: makeBaguaTexture(), transparent: true })
    );
    face.position.z = wheelDepth / 2 + 0.02;
    wheelDisc.add(face);

    const rimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(wheelRadius, 0.08, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 })
    );
    rimMesh.position.z = wheelDepth / 2 + 0.04;
    wheelDisc.add(rimMesh);

    wheelGroup.add(wheelDisc);

    pointerNeedle = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xE58B83, roughness: 0.3 })
    );
    pointerNeedle.rotation.z = Math.PI;
    pointerNeedle.position.set(0, 4.65, 0.35);
    pointerNeedle.castShadow = true;
    wheelGroup.add(pointerNeedle);

    scene.add(wheelGroup);
  }

  function createAmbientDecoration() {
    const group = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(0.6, 16, 16);

    const sphere1 = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshStandardMaterial({ color: 0xFFAAA5, roughness: 0.4 })
    );
    sphere1.position.set(-6, 3.5, -4);
    sphere1.castShadow = true;
    group.add(sphere1);

    const sphere2 = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshStandardMaterial({ color: 0xA0E7E5, roughness: 0.4 })
    );
    sphere2.position.set(6, 4.5, -5);
    sphere2.castShadow = true;
    group.add(sphere2);

    const pyramid = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xC7CEEA, roughness: 0.5 })
    );
    pyramid.position.set(0, 5, -6);
    pyramid.rotation.y = Math.PI / 4;
    pyramid.castShadow = true;
    group.add(pyramid);

    scene.add(group);
  }

  function triggerSparks(impactPos) {
    const sparkGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const colors = [0xFFAAA5, 0xA8E6CF, 0xFFD3B6, 0xA0E7E5];

    for (let i = 0; i < 12; i += 1) {
      const spark = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
      );
      spark.position.copy(impactPos);
      scene.add(spark);

      gsap.to(spark.position, {
        x: impactPos.x + (Math.random() - 0.5) * 2,
        y: impactPos.y + (Math.random() - 0.2) * 2,
        z: impactPos.z + (Math.random() - 0.5) * 2,
        duration: 0.6 + Math.random() * 0.4,
        ease: 'power2.out'
      });

      gsap.to(spark.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: 'power2.in',
        onComplete: () => scene.remove(spark)
      });
    }
  }

  function resetPose() {
    if (!characterGroup) return;

    gsap.set(characterGroup.position, { x: -4.5, y: 0.2, z: 0 });
    gsap.set(characterGroup.rotation, { x: 0, y: Math.PI / 2, z: 0 });
    gsap.set([leftLegGroup.rotation, rightLegGroup.rotation, leftArmGroup.rotation, rightArmGroup.rotation], {
      x: 0, y: 0, z: 0
    });
    gsap.set(torso.scale, { x: 1, y: 1, z: 1 });
    gsap.set(wheelDisc.rotation, { x: 0, y: 0, z: 0 });
    pointerNeedle.rotation.z = Math.PI;
  }

  function stop() {
    if (masterTimeline) {
      masterTimeline.kill();
      masterTimeline = null;
    }
    if (wheelContinuousTween) {
      wheelContinuousTween.kill();
      wheelContinuousTween = null;
    }
    isAnimating = false;
    completionCallback = null;
  }

  function play(options = {}) {
    if (!initScene() || isAnimating) return false;

    stop();
    resetPose();

    isAnimating = true;
    completionCallback = typeof options.onComplete === 'function' ? options.onComplete : null;

    const startX = -4.5;
    const targetX = 2.4;
    const runDuration = 2.2;
    const jumpTime = runDuration;

    masterTimeline = gsap.timeline({
      onComplete: () => {
        isAnimating = false;
        const done = completionCallback;
        completionCallback = null;
        masterTimeline = null;
        done?.();
      }
    });

    masterTimeline.set(characterGroup.position, { x: startX, y: 0.2, z: 0 });
    masterTimeline.set(characterGroup.rotation, { y: Math.PI / 2 });
    masterTimeline.set([leftLegGroup.rotation, rightLegGroup.rotation, leftArmGroup.rotation, rightArmGroup.rotation], { z: 0, x: 0 });
    masterTimeline.set(torso.scale, { x: 1, y: 1, z: 1 });

    masterTimeline.to(characterGroup.position, {
      x: targetX,
      duration: runDuration,
      ease: 'power1.inOut'
    }, 0);

    masterTimeline.to(leftLegGroup.rotation, {
      z: 0.7,
      repeat: 7,
      yoyo: true,
      duration: runDuration / 8,
      ease: 'sine.inOut'
    }, 0);

    masterTimeline.to(rightLegGroup.rotation, {
      z: -0.7,
      repeat: 7,
      yoyo: true,
      duration: runDuration / 8,
      ease: 'sine.inOut'
    }, 0);

    masterTimeline.to(leftArmGroup.rotation, {
      z: -0.8,
      repeat: 7,
      yoyo: true,
      duration: runDuration / 8,
      ease: 'sine.inOut'
    }, 0);

    masterTimeline.to(rightArmGroup.rotation, {
      z: 0.8,
      repeat: 7,
      yoyo: true,
      duration: runDuration / 8,
      ease: 'sine.inOut'
    }, 0);

    masterTimeline.to(characterGroup.position, {
      y: 0.45,
      repeat: 7,
      yoyo: true,
      duration: runDuration / 8,
      ease: 'sine.inOut'
    }, 0);

    masterTimeline.to([leftLegGroup.rotation, rightLegGroup.rotation, leftArmGroup.rotation, rightArmGroup.rotation], {
      z: 0,
      duration: 0.1
    }, jumpTime);

    masterTimeline.to(characterGroup.position, {
      y: 1.6,
      x: targetX + 0.3,
      duration: 0.35,
      ease: 'power2.out'
    }, jumpTime + 0.1);

    masterTimeline.to(torso.scale, {
      y: 1.25,
      x: 0.85,
      z: 0.85,
      duration: 0.2
    }, jumpTime + 0.1);

    masterTimeline.to(rightArmGroup.rotation, {
      z: -2.2,
      duration: 0.25,
      ease: 'back.out(2)'
    }, jumpTime + 0.15);

    masterTimeline.add(() => {
      triggerSparks(new THREE.Vector3(3.5, 2.7, 0.2));
      gsap.to(pointerNeedle.rotation, {
        z: Math.PI + 0.4,
        duration: 0.08,
        yoyo: true,
        repeat: 5,
        ease: 'sine.inOut'
      });
    }, jumpTime + 0.35);

    masterTimeline.to(wheelDisc.rotation, {
      z: '-=25',
      duration: 2.5,
      ease: 'power3.out'
    }, jumpTime + 0.35);

    masterTimeline.to(characterGroup.position, {
      y: 0.2,
      duration: 0.25,
      ease: 'power2.in'
    }, jumpTime + 0.45);

    masterTimeline.to(torso.scale, {
      y: 0.75,
      x: 1.2,
      z: 1.2,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut'
    }, jumpTime + 0.7);

    masterTimeline.to(rightArmGroup.rotation, {
      z: 0,
      duration: 0.2
    }, jumpTime + 0.7);

    const turnTime = jumpTime + 0.9;

    masterTimeline.to(characterGroup.rotation, {
      y: Math.PI / 4,
      duration: 0.4,
      ease: 'back.out(1.5)'
    }, turnTime);

    masterTimeline.to([leftArmGroup.rotation, rightArmGroup.rotation], {
      z: 2.5,
      duration: 0.3,
      ease: 'back.out(2)'
    }, turnTime + 0.2);

    masterTimeline.to(characterGroup.position, {
      y: 0.4,
      duration: 0.25,
      repeat: 3,
      yoyo: true,
      ease: 'sine.inOut'
    }, turnTime + 0.3);

    masterTimeline.add(() => {
      wheelContinuousTween = gsap.to(wheelDisc.rotation, {
        z: '-=360',
        duration: 8,
        repeat: -1,
        ease: 'none'
      });
    }, jumpTime + 2.85);

    return true;
  }

  function toggleCameraAngle() {
    if (!camera || !gsap) return;
    currentCamAngleIndex = (currentCamAngleIndex + 1) % camPresets.length;
    const preset = camPresets[currentCamAngleIndex];

    cameraButton?.classList.remove('is-changing');
    if (cameraButton) {
      void cameraButton.offsetWidth;
      cameraButton.classList.add('is-changing');
    }

    gsap.to(camera.position, {
      x: preset.x,
      y: preset.y,
      z: preset.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(preset.lookX, preset.lookY, preset.lookZ)
    });
  }

  function resize() {
    if (!renderer || !camera) return;
    const { width, height } = getSize();
    const aspect = width / height;
    const d = 8.5;

    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function renderLoop() {
    if (!renderer || !scene || !camera) return;
    animationFrameId = window.requestAnimationFrame(renderLoop);

    if (!isAnimating && !wheelContinuousTween && wheelDisc) {
      wheelDisc.rotation.z -= 0.005;
    }

    renderer.render(scene, camera);
  }

  function destroy() {
    stop();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    cameraButton?.removeEventListener('click', toggleCameraAngle);
    renderer?.dispose();
    container?.replaceChildren();
  }

  window.Wheel3D = {
    init: initScene,
    play,
    stop,
    reset: resetPose,
    toggleCameraAngle,
    destroy,
    get available() {
      return available;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene, { once: true });
  } else {
    initScene();
  }
})();
