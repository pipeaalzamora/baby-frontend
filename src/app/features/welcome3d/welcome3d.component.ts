import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-welcome3d',
  standalone: true,
  templateUrl: './welcome3d.component.html',
  styleUrls: ['./welcome3d.component.scss'],
})
export class Welcome3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas3d') canvasRef!: ElementRef<HTMLCanvasElement>;

  auth = inject(AuthService);

  loadProgress = signal(0);       // 0–100
  loadError = signal<string | null>(null);
  modelReady = signal(false);

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();
  private animId!: number;
  private stars: THREE.Points | null = null;
  private resizeObserver!: ResizeObserver;

  ngAfterViewInit() {
    this.initScene();
    this.loadModel();
    this.animate();
    this.watchResize();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  // ─── Scene setup ────────────────────────────────────────────────────────────

  private initScene() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || 700;
    const h = canvas.clientHeight || 420;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x0d1117, 1);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0d1117, 0.04);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    this.camera.position.set(0, 1.5, 5);

    // Orbit controls — allow user to rotate/zoom
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI / 1.8;
    this.controls.target.set(0, 0.8, 0);
    this.controls.update();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // Key light (warm)
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.5);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    this.scene.add(keyLight);

    // Fill light (cool blue)
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);
    fillLight.position.set(-4, 2, -2);
    this.scene.add(fillLight);

    // Rim light (purple)
    const rimLight = new THREE.PointLight(0xc084fc, 1.5, 15);
    rimLight.position.set(0, 3, -4);
    this.scene.add(rimLight);

    // Ground plane (receives shadows)
    const groundGeo = new THREE.CircleGeometry(3, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Stars
    this.addStars();
  }

  private addStars() {
    const count = 500;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 80;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  // ─── Model loading ──────────────────────────────────────────────────────────

  private loadModel() {
    const loader = new GLTFLoader();

    loader.load(
      'models/baby.glb',
      (gltf) => {
        const model = gltf.scene;

        // Auto-center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Scale so the tallest dimension fits in ~2 units
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);

        // Re-center after scaling
        box.setFromObject(model);
        box.getCenter(center);
        model.position.sub(center);
        model.position.y += size.y * scale * 0.5; // sit on ground

        // Enable shadows on all meshes
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.scene.add(model);

        // Play first animation if available
        if (gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          const action = this.mixer.clipAction(gltf.animations[0]);
          action.play();
        }

        this.modelReady.set(true);
        this.loadProgress.set(100);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          this.loadProgress.set(pct);
        }
      },
      (err) => {
        console.error('Error loading baby.glb:', err);
        this.loadError.set('No se pudo cargar el modelo 3D.');
      }
    );
  }

  // ─── Render loop ────────────────────────────────────────────────────────────

  private animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls?.update();
    this.mixer?.update(delta);

    // Slow star rotation
    if (this.stars) {
      this.stars.rotation.y = elapsed * 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ─── Resize ─────────────────────────────────────────────────────────────────

  private watchResize() {
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.canvasRef.nativeElement.parentElement!);
  }

  private onResize() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
