/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class Trued6Actor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.trued6 || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'player') return;

    const defenseStats = foundry.utils.mergeObject(
      {
        armour: {
          value: 0,
          name: null
        },
        shield: {
          value: 0,
          name: null
        },
        value: 0,
        label: ""
      },
      actorData.system.defenseStats
    );

    for (let i of actorData.items.filter(it => it.type == "equipment")) {
      if (i.system.type == "Weapon" || !i.system.equipped)
        continue;
      var currentValue = i.system.defenseValue;
      var currentName = i.name;
      var currentStat = defenseStats[i.system.type.toLowerCase()]
      if (currentStat.value < currentValue) {
        currentStat.value = currentValue;
        currentStat.name = currentName;
        if (defenseStats.value < currentValue)
          defenseStats.value = currentValue;
      }
    }
    var labels = [];
    if (defenseStats.armour.value)
      labels.push(defenseStats.armour.name);
    if (defenseStats.shield.value)
      labels.push(defenseStats.shield.name);
    defenseStats.label = labels.join(" + ");
    actorData.system.defenseStats = defenseStats;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    // const systemData = actorData.system;
    // systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const data = { ...super.getRollData() };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'player') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (data.type == "npc")
      return;

    const startingEquipmentIds = await game.settings.get("trued6", "startingEquipment");
    if (startingEquipmentIds.length == 0)
      return;

    let items = await Promise.all(startingEquipmentIds.map(async (i) => (await game.items.get(i)).toObject()));
    this.updateSource({ items: items });
  }
}
