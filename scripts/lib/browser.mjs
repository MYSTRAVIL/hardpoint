// Shared Chromium launch for shot.mjs and audit.mjs.
import { chromium } from 'playwright';

export function launchChromium() {
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}
