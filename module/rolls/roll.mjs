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

  static getRollStyle(event) {
    if (event.altKey)
      return this.RollStyles.Disadvantage;
    if (event.shiftKey)
      return this.RollStyles.Advantage;

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

    return result;
  }

  static getRollFlavor(data, result) {

    let text = "";
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
    result.flavor = `${text}<br>${data.label.toUpperCase()}`;
  }

  static rollFromChat(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    const actor = game.actors.get(dataset.actorId);

    const messageDiv = $(element).closest(".chat-message.message");
    const message = game.messages.get(messageDiv.data("messageId"));
    let newContent = $(message.content);
    newContent.find(".advantage").css("display", "block");
    newContent.find(".chat-reroll").remove();

    message.update({ content: newContent[0].outerHTML });

    this.roll(actor, dataset, event);
  }

  static roll(actor, data, event) {
    const actorRollData = actor.getRollData();
    console.log(actorRollData);
    const rollStyle = this.getRollStyle(event);
    const rollFormula = `1d6cs<=${data.target}`;

    console.log(data);
    let attackRoll = this.createRoll(rollFormula);
    this.sendRollToChat(attackRoll, actor, data, rollStyle);

    if (rollStyle == this.RollStyles.Disadvantage && attackRoll.total > 0) {
      attackRoll = this.createRoll(rollFormula);
      this.sendRollToChat(attackRoll, actor, data, this.RollStyles.Normal);
    }
  }

  static createRoll(rollFormula) {
    let attackRoll = new Roll(rollFormula);
    attackRoll.evaluate({ async: false });
    return attackRoll;
  }

  static async sendRollToChat(roll, actor, data, rollType) {
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
    let rollResult = this.getRollResult(actor, data, roll, rollType);

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
    renderTemplate(this.RollTemplate, templateData).then(content => {
      chatData.content = content;
      if (game.dice3d) {
        game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind)
          .then(_ => ChatMessage.create(chatData));
      } else {
        chatData.sound = CONFIG.sounds.dice;
        ChatMessage.create(chatData);
      }
    });
  }
}