export class Trued6Cae {
  constructor() {
    Hooks.on('applyActiveEffect', (actor, change, _current, _delta, _changes) => this.customActiveEffectHandler(actor, change));
  }

  customActiveEffectHandler(actor, change) {
    const fn = CONFIG.TRUED6.CAE[change.value];
    if (fn == undefined) {
      console.error(`Custom Active Effect called "${change.value}" not found.`, actor, change);
      return;
    }
    fn(actor, change.key);
  }

  effect1(actor, _key) {
    let maxHealth = Math.max(actor.system.health.max, 10);
    foundry.utils.setProperty(actor, "system.health.max", maxHealth);
  }
}