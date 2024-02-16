export class Trued6Roll {
  static RollTemplate = "systems/trued6/templates/roll/chat.hbs";

  //RollMode = public, private, blind, gm
  //RollType = attack, defense, melee, ranged, attribute
  //RollStyle = normal, advantage, disadvantage

  static RollStyles = {
    Normal: 0,
    Advantage: 1,
    Disadvantage: 2
  };

  static getRollStyle(event, data, rollData) {
    if (data.forceAdvantage)
      return this.RollStyles.Advantage;
    if (data.forceDisadvantage)
      return this.RollStyles.Disadvantage;
    if (event.altKey)
      return this.RollStyles.Disadvantage;
    if (event.shiftKey)
      return this.RollStyles.Advantage;
    if (rollData.forceDisadvantage) {
      if ((data.attribute && rollData.forceDisadvantage[data.attribute?.toLowerCase()])
        || data.rollData?.forceDisadvantage[data.rollType.toLowerCase()])
        return this.RollStyles.Disadvantage;
    }
    if (rollData.forceAdvantage) {
      if ((data.attribute && rollData.forceAdvantage[data.attribute?.toLowerCase()])
        || data.rollData?.forceAdvantage[data.rollType.toLowerCase()])
        return this.RollStyles.Advantage;
    }
    return this.RollStyles.Normal;
  }

  static getRollResult(actor, data, roll, rollType) {
    let result = {
      textKey: "TRUED6.DiceRoll.Failure",
      cssClass: "failure",
      damageKey: "TRUED6.DiceRoll.Damage",
      damage: null,
      rollStyle: 0,
      isAttack: true
    };

    this.getRollFlavor(data, result);

    if (rollType == this.RollStyles.Advantage)
      result.rollStyle = this.RollStyles.Advantage;

    if (roll.total == 0)
      return result;

    result.textKey = "TRUED6.DiceRoll.Success";
    result.cssClass = "success";
    result.damage = roll.terms[0].results[0].result;

    if (rollType == this.RollStyles.Disadvantage)
      result.rollStyle = this.RollStyles.Disadvantage;

    if (actor.type == "npc")
      return result;

    if (result.damage == data.target && result.isAttack) {
      result.damage++;
      result.textKey = "TRUED6.DiceRoll.CriticalSuccess";
      result.critical = true;
    }

    if (data.dmgBonus)
      result.damage += parseInt(data.dmgBonus);

    this.removeDamageIfNecessary(result, data);

    return result;
  }

  static getRollFlavor(data, result) {

    let text = "";
    result.isAttack = /^true$/i.test(data.isAttack);

    if (data.rollType == "Melee")
      text = `${game.i18n.localize("TRUED6.Attacks.Melee")} ${game.i18n.localize("TRUED6.DiceRoll.Attack")}`;
    else if (data.rollType == "Ranged")
      text = `${game.i18n.localize("TRUED6.Attacks.Ranged")} ${game.i18n.localize("TRUED6.DiceRoll.Attack")}`;
    else if (data.rollType == "attack")
      text = game.i18n.localize("TRUED6.DiceRoll.Attack");
    else if (data.rollType == "Defense") {
      text = game.i18n.localize("TRUED6.Attacks.Defense");
      result.damageKey = "TRUED6.DiceRoll.Avoid";
      result.isAttack = false;
    }
    else if (data.rollType == "attribute") {
      text = game.i18n.localize("TRUED6.DiceRoll.Attribute");
      result.damage = null;
      result.isAttack = false;
    }
    else if (data.rollType == "skill") {
      text = game.i18n.localize("TRUED6.Skill.Skill");
      this.changeDamageKeyIfIsAttack(result);
    }
    else if (data.rollType == "spell") {
      text = game.i18n.localize("TRUED6.Skill.Spell");
      this.changeDamageKeyIfIsAttack(result);
    }
    else if (data.rollType == "rest") {
      text = game.i18n.localize("TRUED6.Rest");
      this.changeDamageKeyIfIsAttack(result);
    }
    result.flavor = `${text}<br>${data.label.toUpperCase()}`;
  }

  static changeDamageKeyIfIsAttack(result) {
    if (!result.isAttack) {
      result.damageKey = "TRUED6.Skill.RollResult";
    }
  }

  static removeDamageIfNecessary(result, data) {
    if (["attribute"].includes(data.rollType))
      result.damage = null;
  }

  static async rollFromChat(event) {
    event.preventDefault();
    const element = event.currentTarget;

    const messageDiv = $(element).closest(".chat-message.message");
    const message = game.messages.get(messageDiv.data("messageId"));
    const actor = game.actors.get(message.speaker.actor);
    const data = message.flags.trued6.data;

    let newContent = $(message.content);
    newContent.find(".advantage").css("display", "block");
    newContent.find(".chat-reroll").remove();

    message.update({ content: newContent[0].outerHTML });

    await this.roll(actor, data, event);
  }

  static async roll(actor, data, event) {
    const actorRollData = actor.getRollData();
    const rollStyle = this.getRollStyle(event, data, actorRollData);
    if (!data.target && !data.attribute)
      data.target = actorRollData[data.attribute.toLowerCase()].value;
    const rollFormula = data.formula ?? `1d6cs<=${data.target}`;

    let attackRoll = await this.createRoll(rollFormula, actorRollData);
    return await this.sendRollToChat(attackRoll, actor, data, rollStyle);
  }

  static async createRoll(rollFormula) {
    let attackRoll = new Roll(rollFormula);
    await attackRoll.evaluate();
    return attackRoll;
  }

  static async sendRollToChat(roll, actor, data, rollStyle) {
    let chatData = {
      user: game.user.id,
      speaker: {
        actor: actor.id,
        token: actor.token,
        alias: actor.name
      }
    };
    let rollMode = game.settings.get("core", "rollMode");
    let isPrivate = false;
    let rollResult = this.getRollResult(actor, data, roll, rollStyle);

    if (["gmroll", "blindroll"].includes(rollMode)) {
      chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
      isPrivate = true;
    }
    const templateData = {
      flavor: isPrivate ? "???" : rollResult.flavor,
      user: chatData.user,
      tooltip: isPrivate ? "" : await roll.getTooltip({ async: false }),
      total: isPrivate ? "?" : Math.round(roll.total * 100) / 100,
      rollResult: isPrivate ? "?" : rollResult.textKey,
      cssClass: isPrivate ? null : rollResult.cssClass,
      damageKey: isPrivate ? "?" : rollResult.damageKey,
      damage: isPrivate ? null : rollResult.damage,
      rollStyle: isPrivate ? null : rollResult.rollStyle,
      data: data,
      actorId: actor.id
    };
    chatData = foundry.utils.mergeObject({
      flags: { trued6: { data: data } }
    }, chatData);
    let finalRoll = roll;
    let content = await renderTemplate(this.RollTemplate, templateData);
    chatData.content = content;
    chatData.rolls = [roll];
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind)
      finalRoll = await this.finalizeRoll(chatData, actor, roll, data, rollStyle);
    } else {
      chatData.sound = CONFIG.sounds.dice;
      finalRoll = await this.finalizeRoll(chatData, actor, roll, data, rollStyle);
    }
    return finalRoll;
  }

  static async finalizeRoll(chatData, actor, roll, data, rollStyle) {
    await ChatMessage.create(chatData);
    let finalRoll = roll;
    if (rollStyle == this.RollStyles.Disadvantage && roll.total > 0) {
      const attackRoll = await this.createRoll(roll.formula);
      finalRoll = await this.sendRollToChat(attackRoll, actor, data, this.RollStyles.Normal);
    }
    if (rollStyle == this.RollStyles.Normal && data.itemId) {
      let item = actor.items.get(data.itemId);
      item.updateUsage(roll);
    }
    return finalRoll;
  }
}