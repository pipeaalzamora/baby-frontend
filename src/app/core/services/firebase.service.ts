import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { environment } from '../../../environments/environment';

const firebaseConfig = {
  apiKey: 'AIzaSyCR8UtPh4STNoFW_VbDHd8XFSdU5cGeNAs',
  authDomain: 'proyectos-hobbys-495300.firebaseapp.com',
  projectId: 'proyectos-hobbys-495300',
  storageBucket: 'proyectos-hobbys-495300.firebasestorage.app',
  messagingSenderId: '1057417146171',
  appId: '1:1057417146171:web:ecb9368d3f7f40b16ed11e',
  measurementId: 'G-LHPSYHLPLL',
};

export interface UploadProgress {
  progress: number;   // 0-100
  url?: string;       // disponible cuando completa
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp;
  private storage: FirebaseStorage;
  private analytics: Analytics | null = null;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.storage = getStorage(this.app);

    // Analytics solo en producción y solo en el browser (no SSR)
    if (environment.production && typeof window !== 'undefined') {
      try {
        this.analytics = getAnalytics(this.app);
      } catch {
        // Analytics puede fallar en entornos sin cookies habilitadas
      }
    }
  }

  /**
   * Sube un archivo a Firebase Storage.
   * @param path  ruta en el bucket, ej: "photos/userId/nombre.jpg"
   * @param file  File del input HTML
   * @returns Observable-like via callback con progreso y URL final
   */
  uploadFile(
    storagePath: string,
    file: File,
    onProgress: (p: UploadProgress) => void,
  ): () => void {
    const storageRef = ref(this.storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        );
        onProgress({ progress });
      },
      (error) => {
        onProgress({ progress: 0, error: error.message });
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onProgress({ progress: 100, url });
      },
    );

    // Retorna función para cancelar la subida si fuera necesario
    return () => task.cancel();
  }

  /** Registra un evento de Analytics (solo en producción) */
  logEvent(name: string, params?: Record<string, unknown>) {
    if (this.analytics) {
      logEvent(this.analytics, name, params);
    }
  }
}
