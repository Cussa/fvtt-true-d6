import { TRUED6 } from "../helpers/config.mjs";

export class Trued6Roll {
  static RollTemplate = "systems/trued6/templates/chat/roll.hbs";

  //RollMode = public, private, blind, gm
  //RollType = attack, defense, melee, ranged, attribute
  //RollStyle = normal, advantage, disadvantage

  static getRollStyle(event, data, rollData) {
    let currentRollStyle = {
      hasAdvantage: false,
      hasDisadvantage: false,
      value: parseInt(data.rollStyle ?? 0)
    };
    console.log(currentRollStyle, data);
    if (event.altKey)
      currentRollStyle.hasDisadvantage = true;

    if (event.shiftKey)
      currentRollStyle.hasAdvantage = true;

    if (rollData.forceDisadvantage) {
      if ((data.attribute && rollData.forceDisadvantage[data.attribute?.toLowerCase()])
        || rollData.forceDisadvantage[data.rollType.toLowerCase()])
        currentRollStyle.hasDisadvantage = true;
    }
    if (rollData.forceAdvantage) {
      if ((data.attribute && rollData.forceAdvantage[data.attribute?.toLowerCase()])
        || rollData.forceAdvantage[data.rollType.toLowerCase()])
        currentRollStyle.hasAdvantage = true;
    }
    currentRollStyle.value += currentRollStyle.hasAdvantage ? 1 : 0;
    currentRollStyle.value += currentRollStyle.hasDisadvantage ? -1 : 0;

    currentRollStyle.value = Math.min(1, Math.max(currentRollStyle.value, -1));

    return currentRollStyle.value;
  }

  static getRollResult(actor, data, roll, rollStyle, actorRollData) {
    let result = {
      textKey: roll.total > 0 ? "TRUED6.DiceRoll.Success" : "TRUED6.DiceRoll.Failure",
      isSuccess: roll.total > 0,
      cssClass: roll.total > 0 ? "success" : "failure",
      resultKey: "TRUED6.DiceRoll.Damage",
      resultValue: roll.countSuccess ? roll.terms[0].results[0].result : roll.total,
      rollStyle: rollStyle,
      isAttack: true
    };

    this.getRollFlavor(data, result, actorRollData);

    if (!result.isSuccess) {
      if (result.rollStyle == TRUED6.rollStyle.values.Disadvantage)
        result.rollStyle = TRUED6.rollStyle.values.Normal;
      result.resultValue = null;
      return result;
    }

    if (actor.type == "npc")
      return result;

    if (result.resultValue == data.target && data.target > 1) {
      if (result.isAttack)
        result.resultValue++;

      result.textKey = "TRUED6.DiceRoll.CriticalSuccess";
    }

    if (data.dmgBonus)
      result.resultValue += parseInt(data.dmgBonus);

    this.removeDamageIfNecessary(result, data);

    result.resultValue = result.resultValue < 0 ? game.i18n.localize("TRUED6.DiceRoll.All") : result.resultValue?.toString();

    return result;
  }

  static getRollFlavor(data, result, actorRollData) {

    let text = "";
    if (data.rollType == "Melee")
      text = `${game.i18n.localize("TRUED6.Attacks.Melee")} ${game.i18n.localize("TRUED6.DiceRoll.Attack")}`;
    else if (data.rollType == "Ranged")
      text = `${game.i18n.localize("TRUED6.Attacks.Ranged")} ${game.i18n.localize("TRUED6.DiceRoll.Attack")}`;
    else if (data.rollType == "attack")
      text = game.i18n.localize("TRUED6.DiceRoll.Attack");
    else if (data.rollType == "defense") {
      text = game.i18n.localize("TRUED6.Attacks.Defense");
      result.resultKey = "TRUED6.DiceRoll.Avoid";
      result.isAttack = false;
      if (actorRollData.defenseStats.shield.value > 0 &&
        actorRollData.defenseStats.armour.value > 0 &&
        result.resultValue == 1) {
        result.resultValue = -100;
      }
    }
    else if (data.rollType == "attribute") {
      text = game.i18n.localize("TRUED6.DiceRoll.Attribute");
      result.resultValue = null;
      result.isAttack = false;
    }
    else if (data.rollType == "skill") {
      text = game.i18n.localize("TRUED6.Skill.Skill");
      result.isAttack = /^true$/i.test(data.isAttack);
      this.changeDamageKeyIfIsAttack(result);
    }
    else if (data.rollType == "spell") {
      text = game.i18n.localize("TRUED6.Skill.Spell");
      result.isAttack = /^true$/i.test(data.isAttack);
      this.changeDamageKeyIfIsAttack(result);
    }
    else if (data.rollType == "rest") {
      text = game.i18n.localize("TRUED6.Rest");
      result.isAttack = false;
      this.changeDamageKeyIfIsAttack(result);
    }
    result.flavor = `${text}<br>${data.label.toUpperCase()}`;
  }

  static changeDamageKeyIfIsAttack(result) {
    if (!result.isAttack) {
      result.resultKey = "TRUED6.Skill.RollResult";
    }
  }

  static removeDamageIfNecessary(result, data) {
    if (["attribute"].includes(data.rollType) || result.total == 0 || result.resultValue == 0)
      result.resultValue = null;
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

    await this.roll(actor, data, event, TRUED6.rollStyle.values.Normal);
  }

  static async roll(actor, data, event, rollStyle) {
    const actorRollData = actor.getRollData();
    rollStyle = rollStyle ?? this.getRollStyle(event, data, actorRollData);
    if (!data.target && data.attribute && data.attribute != "none")
      data.target = actorRollData[data.attribute.toLowerCase()]?.value;
    const rollFormula = data.formula ? data.formula : `1d6cs<=${data.target}`;

    let attackRoll = await this.createRoll(rollFormula, actorRollData);
    return await this.sendRollToChat(attackRoll, actor, data, rollStyle, actorRollData);
  }

  static async createRoll(rollFormula, actorRollData) {
    console.log(rollFormula);
    let attackRoll = new Roll(rollFormula, actorRollData);
    await attackRoll.evaluate();
    attackRoll.countSuccess = attackRoll._formula.indexOf("cs") > -1;
    return attackRoll;
  }

  static async sendRollToChat(roll, actor, data, rollStyle, actorRollData) {
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
    let rollResult = this.getRollResult(actor, data, roll, rollStyle, actorRollData);

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
      damageKey: isPrivate ? "?" : rollResult.resultKey,
      damage: isPrivate ? null : rollResult.resultValue,
      rollStyle: isPrivate ? null : rollResult.rollStyle,
      roll: roll,
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
    } else {
      chatData.sound = CONFIG.sounds.dice;
    }
    finalRoll = await this.finalizeRoll(chatData, actor, roll, data, rollStyle, actorRollData);
    return finalRoll;
  }

  static async finalizeRoll(chatData, actor, roll, data, rollStyle, actorRollData) {
    await ChatMessage.create(chatData);
    let finalRoll = roll;
    if (rollStyle == TRUED6.rollStyle.values.Disadvantage && roll.total > 0) {
      const attackRoll = await this.createRoll(roll.formula);
      finalRoll = await this.sendRollToChat(attackRoll, actor, data, TRUED6.rollStyle.values.Normal, actorRollData);
    }
    if (data.itemId &&
      ((rollStyle == TRUED6.rollStyle.values.Disadvantage && roll.total == 0) ||
        rollStyle == TRUED6.rollStyle.values.Normal)) {
      let item = actor.items.get(data.itemId);
      await item.updateUsage(roll);
    }
    return finalRoll;
  }
}