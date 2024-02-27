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
}