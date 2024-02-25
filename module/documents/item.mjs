import { TRUED6 } from "../helpers/config.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class Trued6Item extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();

    if (this.type != "equipment")
      return;

    const equipped = this.system.equipped;
    for (let effect of this.effects) {
      effect.disabled = !equipped;
    }
  }

  async updateUsage(roll) {
    if (!["skill"].includes(this.type) || this.system.usageType == "passive")
      return;

    if (this.system.usageType == "rest") {
      await this.update({ "system.whenRestUsed": true });
      return;
    }

    if (this.system.usageType == "fail" && (roll?.total ?? 0) == 0) {
      await this.update({ "system.whenFailedUsed": true });
      return;
    }
  }

  async refreshUsage() {
    if (!["skill"].includes(this.type) || this.system.usageType == "none")
      return;

    await this.update({
      "system.whenFailedUsed": false,
      "system.whenRestUsed": false
    });
  }

  async equipUnequip() {
    const currentEquip = this.system.equipped;
    await this.update({ "system.equipped": !currentEquip });
  }

  _getLabelGeneric(labels) {
    return labels.join(" - ");
  }

  _getLabelSkill(labels) {
    if (this.system.attribute)
      labels.push(game.i18n.localize(`${CONFIG.TRUED6.attributes[this.system.attribute]}.long`));
    if (this.system.isSpell)
      labels.push(game.i18n.localize("TRUED6.Skill.Spell"));
    if (this.system.isAttack)
      labels.push(game.i18n.localize("TRUED6.DiceRoll.Attack"));

    labels.push(game.i18n.localize(`TRUED6.Skill.UsageType.${this.system.usageType}`));

    if (this.system.rollStyle != TRUED6.rollStyle.values.Normal)
      labels.push(game.i18n.localize(TRUED6.rollStyle.keys[this.system.rollStyle]))

    return labels.join(this.img ? "<br>" : " - ");
  }

  _getLabelEquipment(labels) {
    labels.push(game.i18n.localize(`TRUED6.Equipment.${this.system.type}`));
    if (this.system.attackType)
      labels.push(game.i18n.localize(`${CONFIG.TRUED6.attributes[this.system.attackType.toLowerCase()]}.long`));
    if (this.system.damageBonus)
      labels.push(`${game.i18n.localize(`TRUED6.Equipment.DmgBonus`)}: ${this.system.damageBonus}`)
    if (this.system.defenseValue)
      labels.push(`${game.i18n.localize(`TRUED6.Equipment.Defense`)}: ${this.system.defenseValue}`)
    if (this.system.rollStyle != TRUED6.rollStyle.values.Normal)
      labels.push(game.i18n.localize(TRUED6.rollStyle.keys[this.system.rollStyle]))

    return labels.join(this.img ? "<br>" : " - ");
  }

  async sendToChat(actor) {
    const templatePath = `systems/trued6/templates/chat/item.hbs`;
    let funcName = `_getLabel${this.type.capitalize()}`;
    if (this[funcName] == undefined)
      funcName = "_getLabelGeneric";
    let labels = [
      game.i18n.localize(`TYPES.Item.${this.type}`)
    ];
    this.label = this[funcName](labels);

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: actor.id,
        token: actor.token,
        alias: actor.name
      },
      content: await renderTemplate(templatePath, this)
    };
    await ChatMessage.create(chatData);
  }
}
