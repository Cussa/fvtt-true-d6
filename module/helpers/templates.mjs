/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/trued6/templates/actor/parts/actor-effects.hbs',
    'systems/trued6/templates/actor/parts/skills.hbs',
    // Player partials
    'systems/trued6/templates/actor/player-parts/attributes.hbs',
    'systems/trued6/templates/actor/player-parts/equipments.hbs',
    'systems/trued6/templates/actor/player-parts/inventory.hbs',
    // NPC partials
    'systems/trued6/templates/actor/npc-parts/attacks.hbs',
    // Item partials
    'systems/trued6/templates/item/parts/item-effects.hbs',
  ]);
};
