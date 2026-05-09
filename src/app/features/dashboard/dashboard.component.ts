import {
  Component, OnInit, AfterViewInit, OnDestroy,
  inject, signal, ViewChild, ElementRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ChildService } from '../../core/services/child.service';
import { VaccineService } from '../../core/services/vaccine.service';
import { MeasurementService } from '../../core/services/measurement.service';
import { Child, Vaccine, Measurement } from '../../core/models/models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // Canvas siempre en el DOM (fuera del @if) para que ViewChild funcione
  @ViewChild('canvas3d') canvasRef!: ElementRef<HTMLCanvasElement>;
  // Slot donde se mueve el canvas visualmente
  @ViewChild('canvasSlot') slotRef!: ElementRef<HTMLDivElement>;

  auth        = inject(AuthService);
  private childSvc   = inject(ChildService);
  private vaccineSvc = inject(VaccineService);
  private measureSvc = inject(MeasurementService);

  child           = signal<Child | null>(null);
  pendingVaccines = signal<Vaccine[]>([]);
  lastMeasurement = signal<Measurement | null>(null);
  loading         = signal(true);
  modelProgress   = signal(0);
  modelReady      = signal(false);

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private mixer: THREE.AnimationMixer | null = null;
  private model: THREE.Group | null = null;
  private isDragging = false;
  private stars: THREE.Points | null = null;
  private starVelocities: Float32Array | null = null; // velocidades por estrella
  private clock = new THREE.Clock();
  private animId!: number;
  private ro!: ResizeObserver;

  ngOnInit() {
    forkJoin({
      child:        this.childSvc.get().pipe(catchError(() => of(null))),
      vaccines:     this.vaccineSvc.list().pipe(catchError(() => of([]))),
      measurements: this.measureSvc.list().pipe(catchError(() => of([]))),
    }).subscribe(({ child, vaccines, measurements }) => {
      this.child.set(child);
      this.pendingVaccines.set(
        (vaccines as Vaccine[])
          .filter(v => v.status === 'pending')
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
          .slice(0, 3)
      );
      const sorted = (measurements as Measurement[]).sort((a, b) => b.date.localeCompare(a.date));
      this.lastMeasurement.set(sorted[0] ?? null);
      this.loading.set(false);

      // Once data loads, move canvas into the visible slot
      setTimeout(() => this.mountCanvas(), 50);
    });
  }

  ngAfterViewInit() {
    // Init Three.js immediately — canvas is always in DOM
    this.initScene();
    this.loadModel();
    this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.ro?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  /** Move the hidden canvas into the visible slot after data loads */
  private mountCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    const slot   = this.slotRef?.nativeElement;
    if (!canvas || !slot) return;

    canvas.classList.remove('canvas3d--hidden');
    canvas.classList.add('canvas3d--visible');
    slot.appendChild(canvas);

    // Resize to fit the new container
    this.onResize();

    // Watch for resize
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(slot);
  }

  // ─── Three.js ─────────────────────────────────────────────────────────────

  private initScene() {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(1, 1); // tiny until mounted
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 1.4, 5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 9;
    this.controls.maxPolarAngle = Math.PI / 1.7;
    this.controls.target.set(0, 0.7, 0);
    this.controls.update();

    // Pausar auto-rotación mientras el usuario arrastra
    this.controls.addEventListener('start', () => { this.isDragging = true; });
    this.controls.addEventListener('end',   () => { this.isDragging = false; });

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xfff0e0, 2.8);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x7dd3fc, 1.4);
    fill.position.set(-4, 2, -2);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0x38bdf8, 2, 12);
    rim.position.set(0, 3, -3);
    this.scene.add(rim);

    this.addParticles();
  }

  private addParticles() {
    const count = 200;
    const pos = new Float32Array(count * 3);
    // Velocidades aleatorias por estrella (x, y, z)
    this.starVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2; // detrás del modelo

      // Velocidad de deriva lenta y aleatoria
      this.starVelocities[i * 3]     = (Math.random() - 0.5) * 0.004;
      this.starVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.004;
      this.starVelocities[i * 3 + 2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Tamaños variados para dar profundidad
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) sizes[i] = 0.03 + Math.random() * 0.08;
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.06,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private loadModel() {
    new GLTFLoader().load(
      'models/baby.glb',
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = 2 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        box.setFromObject(model);
        box.getCenter(center);
        model.position.sub(center);
        model.position.y += size.y * scale * 0.5;
        model.traverse(c => {
          if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });
        this.scene.add(model);
        this.model = model; // guardar referencia para auto-rotación
        if (gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          this.mixer.clipAction(gltf.animations[0]).play();
        }
        this.modelReady.set(true);
      },
      xhr => { if (xhr.total > 0) this.modelProgress.set(Math.round(xhr.loaded / xhr.total * 100)); },
      err => console.error('GLB load error', err)
    );
  }

  private animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    this.controls?.update();
    this.mixer?.update(delta);

    // Auto-rotación del modelo — se pausa si el usuario está arrastrando
    if (this.model && !this.isDragging) {
      this.model.rotation.y += 0.004;
      // Leve flotación vertical
      this.model.position.y = Math.sin(elapsed * 0.8) * 0.06;
    }

    // Mover estrellas individualmente
    if (this.stars && this.starVelocities) {
      const positions = this.stars.geometry.attributes['position'];
      const arr = positions.array as Float32Array;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        arr[i * 3]     += this.starVelocities[i * 3];
        arr[i * 3 + 1] += this.starVelocities[i * 3 + 1];

        // Rebote en los bordes — si sale del área vuelve al lado opuesto
        if (arr[i * 3] > 8)  arr[i * 3] = -8;
        if (arr[i * 3] < -8) arr[i * 3] = 8;
        if (arr[i * 3 + 1] > 8)  arr[i * 3 + 1] = -8;
        if (arr[i * 3 + 1] < -8) arr[i * 3 + 1] = 8;
      }
      positions.needsUpdate = true;

      // Rotación lenta del conjunto de estrellas
      this.stars.rotation.z += 0.0003;
      this.stars.rotation.y += 0.0002;
    }

    this.renderer?.render(this.scene, this.camera);
  }

  private onResize() {
    const slot = this.slotRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!slot || !canvas) return;
    const w = slot.clientWidth;
    const h = slot.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  get ageText(): string {
    const child = this.child();
    if (!child?.birthDate) return '';
    const birth = new Date(child.birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 1) return 'Recién nacido';
    if (months < 24) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const y = Math.floor(months / 12), r = months % 12;
    return r > 0 ? `${y} años y ${r} meses` : `${y} años`;
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
