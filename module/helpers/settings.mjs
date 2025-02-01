import { StartingEquipmentForm } from "../configuration/startingEquipment.mjs";

export const registerSystemSettings = function () {
  game.settings.registerMenu("trued6", "startingEquipmentMenu", {
    name: "Starting Equipment",
    label: "Starting Equipment",
    type: StartingEquipmentForm,
    restricted: true,
  });
  game.settings.register("trued6", "startingEquipment", {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
  game.settings.register('trued6', 'useStepBonus', {
    name: "Use Step Bonus",
    hint: "Shows a dialog with a step bonus from -3 to +3 for the rolls",
    scope: 'world',
    type: Boolean,
    config: true,
    default: false
  });
}