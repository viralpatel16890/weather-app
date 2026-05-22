import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Top-level shell. Renders the active route via <router-outlet>. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
