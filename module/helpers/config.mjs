export const TRUED6 = {};

/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
TRUED6.debug = true;

TRUED6.attributes = {
  str: 'TRUED6.Attributes.Str',
  dex: 'TRUED6.Attributes.Dex',
  con: 'TRUED6.Attributes.Con',
  int: 'TRUED6.Attributes.Int',
  wis: 'TRUED6.Attributes.Wis',
  cha: 'TRUED6.Attributes.Cha',
};

TRUED6.rollStyle = {
  keys: {
    "-1": 'TRUED6.DiceRoll.RollStyle.Disadvantage',
    "0": 'TRUED6.DiceRoll.RollStyle.Normal',
    "1": 'TRUED6.DiceRoll.RollStyle.Advantage',
  },
  values: {
    Normal: 0,
    Advantage: 1,
    Disadvantage: -1
  }
}