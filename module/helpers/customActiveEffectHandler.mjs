import { perday } from "./customActiveEffects/perDay.mjs";

export class Trued6Cae {
  registerHook() {
    Hooks.on('applyActiveEffect', (actor, change, _current, _delta, _changes) => this.customActiveEffectHandler(actor, change));
  }

  customActiveEffectHandler(actor, change) {
    const fn = CONFIG.TRUED6.CAE[change.value];
    if (fn == undefined) {
      console.error(`Custom Active Effect called "${change.value}" not found.`, actor, change);
      return;
    }
    fn(actor, change);
  }

  perday(actor, change) { perday(actor, change); }
}