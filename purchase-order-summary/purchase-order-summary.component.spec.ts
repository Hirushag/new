import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderSummaryComponent } from './purchase-order-summary.component';

describe('PurchaseOrderSummaryComponent', () => {
  let component: PurchaseOrderSummaryComponent;
  let fixture: ComponentFixture<PurchaseOrderSummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PurchaseOrderSummaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PurchaseOrderSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
