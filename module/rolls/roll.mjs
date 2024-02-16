export class Trued6Roll {
  static RollTemplate = "systems/trued6/templates/roll/chat.hbs";
  static RollTypes = {
    Normal: 0,
    Advantage: 1,
    Disadvantage: 2
  };

  static getRollType(event) {
    if (event.altKey)
      return this.RollTypes.Disadvantage;
    if (event.shiftKey)
      return this.RollTypes.Advantage;

    return this.RollTypes.Normal;
  }

  static getRollResult(actor, data, roll, rollType) {
    let result = {
      textKey: "TRUED6.DiceRoll.Failure",
      cssClass: "failure",
      damage: null,
      rollType: 0
    };

    if (rollType == this.RollTypes.Advantage)
      result.rollType = this.RollTypes.Advantage;

    if (roll.total == 0)
      return result;

    result.textKey = "TRUED6.DiceRoll.Success";
    result.cssClass = "success";
    result.damage = roll.terms[0].results[0].result;

    if (rollType == this.RollTypes.Disadvantage)
      result.rollType = this.RollTypes.Disadvantage;

    if (actor.type == "npc")
      return result;

    if (result.damage == data.target) {
      result.damage++;
      result.textKey = "TRUED6.DiceRoll.CriticalSuccess";
    }

    return result;
  }

  static getRollFlavor(data, result) {

    let text = "";
    if (data.rollType == "attack")
      text = game.i18n.localize("TRUED6.DiceRoll.Attack");
    if (data.rollType == "attribute") {
      text = game.i18n.localize("TRUED6.DiceRoll.Attribute");
      result.damage = null;
    }
    result.flavor = `${text}<br>${data.label.toUpperCase()}`;
  }

  static rollFromChat(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    console.log(dataset);
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
    const rollType = this.getRollType(event);
    const rollFormula = `1d6cs<=${data.target}`;
    console.log(rollType);

    let attackRoll = this.createRoll(rollFormula);
    this.sendRollToChat(attackRoll, actor, data, rollType);

    if (rollType == this.RollTypes.Disadvantage && attackRoll.total > 0) {
      attackRoll = this.createRoll(rollFormula);
      this.sendRollToChat(attackRoll, actor, data, this.RollTypes.Normal);
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
    this.getRollFlavor(data, rollResult);

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
      damage: isPrivate ? null : rollResult.damage,
      rollType: isPrivate ? null : rollResult.rollType,
      rollTypeText: isPrivate ? null : rollResult.rollTypeText,
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