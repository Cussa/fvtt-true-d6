export class Trued6Roll {
  static RollTemplate = "systems/trued6/templates/roll/chat.hbs";
  static RollModes = {
    Normal: 0,
    Advantage: 1,
    Disadvantage: 2
  };

  static getRollMode(event) {
    if (event.altKey)
      return this.RollModes.Disadvantage;
    if (event.shiftKey)
      return this.RollModes.Advantage;

    return this.RollModes.Normal;
  }

  static getRollResult(actor, data, roll) {
    if (actor.type == "npc")
      return game.i18n.localize(roll.total > 0 ? "TRUED6.DiceRoll.Success" : "TRUED6.DiceRoll.Failure");

    //TODO: check if the roll is equal to the target
    return game.i18n.localize(roll.total > 0 ? "TRUED6.DiceRoll.Success" : "TRUED6.DiceRoll.Failure");
  }

  static getRollFlavor(data) {
    if (data.rollType == "creatureAttack")
      return `${game.i18n.localize("TRUED6.DiceRoll.Attack")}: ${data.attackName}`;
  }

  static roll(actor, data, event) {
    const rollMode = this.getRollMode(event);
    if (actor.type == "npc")
      return this.rollNpc(actor, data, rollMode);
    return rollPC(actor, data, rollMode);
  }

  static rollNpc(actor, data, rollMode) {
    console.log("NPC Roll", actor, data, rollMode);
    const rollFormula = `1d6cs<=@${data.attackName.toLowerCase()}.value`;

    let attackRoll = this.createRoll(actor, rollFormula);
    this.sendRollToChat(attackRoll, actor, data);
  }

  rollPC(actor, data, rollMode) {

  }

  static createRoll(actor, rollFormula) {
    let attackRoll = new Roll(rollFormula, actor.getRollData());
    attackRoll.evaluate({ async: false });

    console.log(attackRoll);
    return attackRoll;
  }

  static async sendRollToChat(roll, actor, data) {
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

    if (["gmroll", "blindroll"].includes(rollMode)) {
      chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
      isPrivate = true;
    }
    const templateData = {
      formula: isPrivate ? "???" : roll._formula,
      flavor: isPrivate ? null : this.getRollFlavor(data),
      user: chatData.user,
      tooltip: isPrivate ? "" : await roll.getTooltip({ async: false }),
      total: isPrivate ? "?" : Math.round(roll.total * 100) / 100,
      rollResult: isPrivate ? "?" : this.getRollResult(actor, data, roll),
      cssClass: roll.total > 0 ? "success" : "failure"
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