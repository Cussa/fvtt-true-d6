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
  }

  async updateUsage(roll) {
    console.log(roll, this);
    if (!["skill", "spell"].includes(this.type) || this.system.usageType == "none")
      return;

    if (this.system.usageType == "rest") {
      this.update({ "system.whenRestUsed": true });
      return;
    }

    if (this.system.usageType == "fail" && roll?.total == 0) {
      this.update({ "system.whenFailedUsed": true });
      return;
    }
  }

  _getLabelGeneric(labels) {
    return labels.join(" - ");
  }

  _getLabelSkill(labels) {
    if (this.system.attribute)
      labels.push(game.i18n.localize(`TRUED6.Attributes.${this.system.attribute}.long`));
    if (this.system.isSpell)
      labels.push(game.i18n.localize("TYPES.Item.spell"));
    if (this.system.isAttack)
      labels.push(game.i18n.localize("TRUED6.DiceRoll.Attack"));

    labels.push(game.i18n.localize(`TRUED6.Skill.UsageType.${this.system.usageType}`));

    return labels.join(this.img ? "<br>" : " - ");
  }

  _getLabelEquipment(labels) {
    labels.push(game.i18n.localize(`TRUED6.Equipment.${this.system.type}`));
    if (this.system.attackType)
      labels.push(game.i18n.localize(`TRUED6.Attributes.${this.system.attackType}.long`));
    if (this.system.damageBonus)
      labels.push(`${game.i18n.localize(`TRUED6.Equipment.DmgBonus`)}: ${this.system.damageBonus}`)
    if (this.system.defenseValue)
      labels.push(`${game.i18n.localize(`TRUED6.Equipment.Defense`)}: ${this.system.defenseValue}`)
    if (this.system.forceDisadvantage)
      labels.push(`${game.i18n.localize(`TRUED6.Equipment.ForceDisadvantage`)}`)
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
