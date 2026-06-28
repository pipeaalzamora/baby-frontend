import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BillingService } from '../../core/services/billing.service';

type ResultStatus = 'success' | 'failed' | 'cancelled';

@Component({
  selector: 'app-billing-result',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './billing-result.component.html',
  styleUrls: ['./billing-result.component.scss'],
})
export class BillingResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private billing = inject(BillingService);

  status = signal<ResultStatus>('failed');

  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get('status');
    this.status.set(this.normalize(raw));
    // Refrescamos el estado premium para reflejar el resultado del pago.
    this.billing.status().subscribe({ error: () => undefined });
  }

  private normalize(value: string | null): ResultStatus {
    if (value === 'success' || value === 'cancelled') return value;
    return 'failed';
  }
}
