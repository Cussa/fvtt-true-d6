import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';
import { Trued6Roll } from '../rolls/roll.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class Trued6ActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['trued6', 'sheet', 'actor'],
      template: 'systems/trued6/templates/actor/actor-sheet.hbs',
      width: 675,
      height: 675,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'attributes',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/trued6/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'player') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    if (CONFIG.TRUED6.debug)
      console.log(context);
    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    let attributesArray = [];

    var attributesLength = Object.keys(CONFIG.TRUED6.attributes).length;

    for (let [k, v] of Object.entries(context.system.attributes)) {
      const key = CONFIG.TRUED6.attributes[k];
      v.abbr = (game.i18n.localize(`${key}.abbr`) ?? k).toUpperCase();
      v.label = (game.i18n.localize(`${key}.long`) ?? k).toUpperCase();
      v.explanation = game.i18n.localize(`${key}.explanation`) ?? k;
      v.key = k;
      const order = parseInt(game.i18n.localize(`${key}.order`));
      v.cssClass = order == 1 ? "top-left" : (order < attributesLength ? "" : "bottom-left");
      attributesArray[order] = v;
    }
    context.attributes = attributesArray;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const inventoryItems = [];
    const equipments = {
      true: {
        label: game.i18n.localize("TRUED6.Equipment.Equipped"),
        items: []
      },
      false: {
        label: game.i18n.localize("TRUED6.Equipment.Unequipped"),
        items: []
      }
    };
    const skills = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'inventoryItem') {
        inventoryItems.push(i);
      }
      else if (i.type === 'equipment') {
        i.equipClass = i.system.equipped ? "box-open" : "box";
        if (i.system.type == "Weapon") {
          i.rollable = true;
          i.rollType = "";
          i.attribute = i.system.attackType;
          if (i.system.attackType == "Str") {
            i.target = context.actor.system.attributes.str.value;
            i.rollType = "Melee";
          }
          else if (i.system.attackType == "Dex") {
            i.target = context.actor.system.attributes.dex.value;
            i.rollType = "Ranged";
          }
          i.label = i.name;
        }
        else if (i.system.type == "Armour") {
          i.rollable = false;
          i.rollType = "Defense";
          i.label = i.name;
          i.target = i.system.defenseValue;
        }
        else if (i.system.type == "Shield") {
          i.rollable = false;
          i.rollType = "Defense";
          i.label = i.name;
          i.target = i.system.defenseValue;
        }
        equipments[i.system.equipped].items.push(i);
      }
      else if (i.type == "skill") {
        i.isUsed = i.system.whenRestUsed || i.system.whenFailedUsed;
        i.rollable = (i.system.attribute || i.system.formula) && !i.isUsed;
        i.usable = !i.system.attribute && !i.system.formula && !i.isUsed && i.system.usageType != "passive";

        i.isUsedInfo = i.system.usageType != "passive" ? game.i18n.localize(i.isUsed ? "Yes" : "No") : null;
        i.rollType = i.system.isSpell ? "spell" : "skill";
        skills.push(i);
      }
    }

    // Assign and return
    equipments.true.items = equipments.true.items
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.system.type.localeCompare(b.system.type));
    equipments.false.items = equipments.false.items
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.system.type.localeCompare(b.system.type));
    context.equipments = [equipments.true, equipments.false];
    context.inventoryItems = inventoryItems.sort((a, b) => a.name.localeCompare(b.name));
    context.skills = skills.sort((a, b) => a.name.localeCompare(b.name));

    if (this.actor.type == "npc") {
      context.system.melee.cssClass = context.system.melee.value > 0 ? "rollable" : "";
      context.system.ranged.cssClass = context.system.ranged.value > 0 ? "rollable" : "";
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));
    html.on('click', '.short-rest-button', this._onShortRest.bind(this));
    html.on('click', '.long-rest-button', this._onLongRest.bind(this));
    html.on('click', '.usable', this._onItemUse.bind(this));
    html.on('click', '.refreshUse', this._onItemRefresh.bind(this));
    html.on('click', '.send-to-chat', this._onItemSendToChat.bind(this));
    html.on('click', '.equip', this._onItemEquip.bind(this));
    html.on('contextmenu', '.skills .rollable', this._onItemUse.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable attributes.
    html.on('click', '.rollable', this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const actor = this.actor;

    return Trued6Roll.roll(actor, dataset, event, null);
  }

  async _onShortRest(event) {
    event.preventDefault();

    var newHealth = Math.min(this.actor.system.health.value + 1, this.actor.system.health.max);
    await this.actor.update({ "system.health.value": newHealth });

    var buttons = {};

    for (let i of this.actor.items) {
      if (i.type != "skill" || (!i.system.whenRestUsed && !i.system.whenFailedUsed))
        continue;
      buttons[i._id] = {
        label: i.name,
        callback: () => (i._id)
      };
    }

    var buttonKeys = Object.keys(buttons);
    if (buttonKeys.length == 0) {
      await this._notifyRest(false);
      return;
    }

    if (buttonKeys.length == 1) {
      await this.actor.items.get(buttonKeys[0]).refreshUsage();
      await this._notifyRest(false);
      return;
    }

    const dialogOutput = await Dialog.wait({
      title: game.i18n.localize("TRUED6.RecoverSkill"),
      buttons: buttons,
      close: () => { return false; }
    });

    if (dialogOutput)
      await this.actor.items.get(dialogOutput).refreshUsage();

    await this._notifyRest(false);
  }

  async _onLongRest(event) {
    event.preventDefault();

    const data = {
      formula: "1d6",
      label: game.i18n.localize("TRUED6.LongRest"),
      rollType: "rest"
    };
    const roll = await Trued6Roll.roll(this.actor, data, {}, null);

    var newHealth = Math.min(this.actor.system.health.value + roll.total, this.actor.system.health.max);
    await this.actor.update({ "system.health.value": newHealth });

    for (let i of this.actor.items) {
      await i.refreshUsage();
    }

    await this._notifyRest(true);
  }

  async _notifyRest(long) {
    const key = `TRUED6.${long ? "Long" : "Short"}Rest`;
    ui.notifications.info(`${this.actor.name}: ${game.i18n.localize(key)}`);
  }

  async _onItemUse(event) {
    const item = this._getItem(event);
    await item.updateUsage(null);
  }

  async _onItemRefresh(event) {
    const item = this._getItem(event);
    await item.refreshUsage();
  }

  async _onItemEquip(event) {
    const item = this._getItem(event);
    await item.equipUnequip();
  }

  async _onItemSendToChat(event) {
    const item = this._getItem(event);
    await item.sendToChat(this.actor);
  }

  _getItem(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    return this.actor.items.get(dataset.itemId);
  }
}
