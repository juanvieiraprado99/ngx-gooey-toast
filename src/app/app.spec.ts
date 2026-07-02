import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Mock HTTP backend: the header's GitHub-stars httpResource must not hit
      // the real api.github.com in tests (403 rate-limit flake).
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the header logo', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // Flush the header's GitHub-stars request so whenStable() can settle.
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((req) => req.flush({ stargazers_count: 1 }));
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo')?.textContent).toContain('ngx-gooey-toast');
  });
});
