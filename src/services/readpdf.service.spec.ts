import { TestBed } from '@angular/core/testing';

import { ReadpdfService } from './readpdf.service';

describe('ReadpdfService', () => {
  let service: ReadpdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReadpdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
