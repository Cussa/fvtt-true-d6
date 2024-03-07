// Import document classes.
import { Trued6Actor } from './documents/actor.mjs';
import { Trued6Item } from './documents/item.mjs';
// Import sheet classes.
import { Trued6ActorSheet } from './sheets/actor-sheet.mjs';
import { Trued6ItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { TRUED6 } from './helpers/config.mjs';
import { Trued6Roll } from './rolls/roll.mjs';
import { RollStyleCssHandler } from './helpers/rollStyleCssHandler.mjs';
import { Trued6Cae } from './helpers/customActiveEffectHandler.mjs';
import { registerSystemSettings } from './helpers/settings.mjs';
import { configureStatusEffects } from './helpers/statusEffects.mjs';

globalThis.trued6 = {
  Trued6Cae: Trued6Cae
};

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.trued6 = {
    Trued6Actor,
    Trued6Item,
    rollItemMacro,
  };
  // CONFIG.debug.hooks = true;

  // Add custom constants for configuration.
  CONFIG.TRUED6 = TRUED6;
  CONFIG.TRUED6.CAE = new Trued6Cae();

  CONFIG.TRUED6.CAE.registerHook();

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d6cs<=@attributes.dex.value'
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = Trued6Actor;
  CONFIG.Item.documentClass = Trued6Item;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('trued6', Trued6ActorSheet, {
    makeDefault: true,
    label: 'TRUED6.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('trued6', Trued6ItemSheet, {
    makeDefault: true,
    label: 'TRUED6.SheetLabels.Item',
  });

  registerSystemSettings();
  configureStatusEffects();

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// // If you need to add Handlebars helpers, here is a useful example:
// Handlebars.registerHelper('toLowerCase', function (str) {
//   return str.toLowerCase();
// });

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  new RollStyleCssHandler().registerHandler();

  if (CONFIG.TRUED6.debug && game.actors.contents.length > 0)
    game.actors.contents[0].sheet.render(true);
});

Hooks.on('renderChatLog', (app, html, _data) => {
  html.on('click', '.chat-reroll', (event) => Trued6Roll.rollFromChat(event));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.trued6.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'trued6.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
