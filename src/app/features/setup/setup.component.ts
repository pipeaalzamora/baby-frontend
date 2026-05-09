import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChildService } from '../../core/services/child.service';
import { AuthService } from '../../core/services/auth.service';
import { BabyModel } from '../../core/models/models';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Catálogo de modelos disponibles — agrega más aquí cuando tengas nuevos .glb
export const BABY_MODELS: BabyModel[] = [
  { key: 'baby', label: 'Bebé clásico', file: 'baby.glb', preview: '👶' },
];

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
})
export class SetupComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('previewCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private childSvc = inject(ChildService);
  private auth     = inject(AuthService);
  private router   = inject(Router);

  // ─── Form fields ──────────────────────────────────────────────────────────
  name          = '';
  birthDate     = '';
  gender: 'M' | 'F' = 'M';
  birthWeightKg = 3.2;
  birthHeightCm = 50;
  bloodType     = '';
  selectedModel = signal<string>('baby');

  // ─── UI state ─────────────────────────────────────────────────────────────
  saving      = signal(false);
  errorMsg    = signal<string | null>(null);
  step        = signal<1 | 2>(1);   // 1 = datos, 2 = modelo
  models      = BABY_MODELS;

  // ─── Three.js ─────────────────────────────────────────────────────────────
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private mixer: THREE.AnimationMixer | null = null;
  private currentModel: THREE.Group | null = null;
  private clock = new THREE.Clock();
  private animId!: number;
  previewReady = signal(false);

  ngOnInit() {
    // Si ya tiene bebé, ir directo al dashboard
    this.childSvc.get().subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => { /* 404 = no tiene bebé, quedarse aquí */ },
    });
  }

  ngAfterViewInit() {
    this.initPreview();
    this.loadPreviewModel(this.selectedModel());
    this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  // ─── Steps ────────────────────────────────────────────────────────────────

  goToStep2() {
    if (!this.name.trim() || !this.birthDate) {
      this.errorMsg.set('Nombre y fecha de nacimiento son obligatorios.');
      return;
    }
    this.errorMsg.set(null);
    this.step.set(2);
    // Dar tiempo al canvas a estar visible antes de inicializar
    setTimeout(() => this.onResize(), 100);
  }

  goToStep1() {
    this.step.set(1);
  }

  selectModel(key: string) {
    this.selectedModel.set(key);
    this.loadPreviewModel(key);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  save() {
    this.saving.set(true);
    this.errorMsg.set(null);

    this.childSvc.upsert({
      name:          this.name.trim(),
      birthDate:     this.birthDate,
      gender:        this.gender,
      birthWeightKg: this.birthWeightKg,
      birthHeightCm: this.birthHeightCm,
      bloodType:     this.bloodType || undefined,
      modelKey:      this.selectedModel(),
    }).subscribe({
      next: (child) => {
        this.auth.updateChildId(child.id);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.saving.set(false);
        this.errorMsg.set('Error al guardar. Intenta de nuevo.');
      },
    });
  }

  // ─── Three.js preview ─────────────────────────────────────────────────────

  private initPreview() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth  || 320;
    const h = canvas.clientHeight || 320;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 1.4, 5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.06;
    this.controls.minDistance    = 2;
    this.controls.maxDistance    = 9;
    this.controls.maxPolarAngle  = Math.PI / 1.7;
    this.controls.target.set(0, 0.7, 0);
    this.controls.update();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xfff0e0, 2.5);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x7dd3fc, 1.2);
    fill.position.set(-4, 2, -2);
    this.scene.add(fill);
  }

  private loadPreviewModel(key: string) {
    // Limpiar modelo anterior
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
      this.mixer = null;
    }
    this.previewReady.set(false);

    const modelDef = this.models.find(m => m.key === key);
    if (!modelDef) return;

    new GLTFLoader().load(
      `/models/${modelDef.file}`,
      (gltf) => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
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
        this.currentModel = model;
        if (gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          this.mixer.clipAction(gltf.animations[0]).play();
        }
        this.previewReady.set(true);
      },
      undefined,
      (err) => console.error('Preview load error', err),
    );
  }

  private animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.controls?.update();
    this.mixer?.update(delta);
    if (this.currentModel) this.currentModel.rotation.y += 0.005;
    this.renderer?.render(this.scene, this.camera);
  }

  private onResize() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  get maxDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
