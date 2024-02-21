import { perDay } from "./customActiveEffects/perDay.mjs";

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

  effect1(actor, _) {
    let maxHealth = Math.max(actor.system.health.max, 10);
    foundry.utils.setProperty(actor, "system.health.max", maxHealth);
  }
  perDay(actor, change) { perDay(actor, change); }
}