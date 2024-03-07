let validStatusEffects = CONFIG.statusEffects;

export function configureStatusEffects() {

  CONFIG.TRUED6.removedStatuses = CONFIG.statusEffects;

  validStatusEffects = CONFIG.statusEffects;

  changeArrayElement("stun", "TRUED6.StatusEffects.Petrified");
  changeArrayElement("disease", "TRUED6.StatusEffects.Sickened");
  changeArrayElement("restrain", "TRUED6.StatusEffects.Blocked");

  console.log(validStatusEffects);
  CONFIG.statusEffects = validStatusEffects;
}

function changeArrayElement(id, label) {
  const index = validStatusEffects.findIndex(it => it.id == id);
  let element = validStatusEffects[index];
  element.name = label;
}