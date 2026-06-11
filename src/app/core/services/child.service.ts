import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Child } from '../models/models';
import { AuthService } from './auth.service';
import { PresignedUpload, S3ObjectReference, S3UploadService, UploadProgress } from './s3-upload.service';

export type ChildProfileInput = Partial<Pick<
  Child,
  | 'name'
  | 'birthDate'
  | 'gender'
  | 'bloodType'
  | 'photoUrl'
  | 'photoProvider'
  | 'photoBucket'
  | 'photoKey'
  | 'photoMimeType'
  | 'photoSize'
  | 'birthWeightKg'
  | 'birthHeightCm'
>>;

@Injectable({ providedIn: 'root' })
export class ChildService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private s3 = inject(S3UploadService);

  private base = `${environment.apiUrl}/child`;
  private childrenBase = `${environment.apiUrl}/children`;

  private _children = signal<Child[]>([]);
  private _activeChild = signal<Child | null>(null);

  readonly children = this._children.asReadonly();
  readonly activeChild = this._activeChild.asReadonly();

  get() {
    return this.http.get<Child>(this.base).pipe(
      tap((child) => this.setActiveLocally(child)),
    );
  }

  list() {
    return this.http.get<Child[]>(this.childrenBase).pipe(
      tap((children) => {
        this._children.set(children);
        const activeID = this.auth.user()?.childId;
        const active = children.find((child) => child.id === activeID) ?? children[0] ?? null;
        this._activeChild.set(active);
        if (active && active.id !== activeID) {
          this.auth.updateChildId(active.id);
        }
      }),
    );
  }

  upsert(data: ChildProfileInput) {
    return this.http.post<Child>(this.base, data).pipe(
      tap((child) => this.setActiveLocally(child)),
    );
  }

  create(data: ChildProfileInput) {
    return this.http.post<Child>(this.childrenBase, data).pipe(
      tap((child) => this.setActiveLocally(child)),
    );
  }

  update(id: string, data: ChildProfileInput) {
    return this.http.patch<Child>(`${this.childrenBase}/${id}`, data).pipe(
      tap((child) => this.setActiveLocally(child)),
    );
  }

  select(id: string) {
    return this.http.post<Child>(`${this.childrenBase}/${id}/select`, {}).pipe(
      tap((child) => this.setActiveLocally(child)),
    );
  }

  uploadProfilePhoto(
    file: File,
    childId: string,
    onProgress: (p: UploadProgress) => void,
  ): Observable<S3ObjectReference> {
    return this.http.post<PresignedUpload>(`${this.childrenBase}/${childId}/photo/presign`, {
      fileName: file.name,
      contentType: file.type || 'image/jpeg',
      sizeBytes: file.size,
    }).pipe(
      switchMap((presigned) => this.s3.upload(presigned, file, onProgress).pipe(
        switchMap(() => new Observable<S3ObjectReference>((observer) => {
          observer.next({
            storageProvider: 's3',
            bucket: presigned.bucket,
            key: presigned.key,
            contentType: presigned.contentType,
            sizeBytes: file.size,
          });
          observer.complete();
        })),
      )),
    );
  }

  private setActiveLocally(child: Child) {
    this._activeChild.set(child);
    this.auth.updateChildId(child.id);
    this._children.update((children) => {
      const exists = children.some((item) => item.id === child.id);
      if (exists) {
        return children.map((item) => item.id === child.id ? child : item);
      }
      return [...children, child];
    });
  }
}
