import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviscelmaComponent } from './deviscelma.component';

describe('DevisComponent', () => {
  let component: DeviscelmaComponent;
  let fixture: ComponentFixture<DeviscelmaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviscelmaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviscelmaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
