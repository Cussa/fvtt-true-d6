export class StartingEquipmentForm extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: '/systems/trued6/templates/settings/starting-equipment.hbs',
      title: "Starting Equipment Configuration",
      width: 400,
      height: 400,
      id: "startingEquipmentForm",
      dragDrop: [{dragSelector:".item-list .item", dropSelector: null}]
    });
  }

  async getData() {
    const listItems = game.settings.get("trued6", "startingEquipment");
    let items = await Promise.all(listItems.map(async (i) => await game.items.get(i)));;
    items = items.sort((a, b) => a.name.localeCompare(b.name));
    const context = { items }
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on('click', '.item-delete', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const itemId = li.data('itemId');
      let listItems = game.settings.get("trued6", "startingEquipment");
      listItems = listItems.filter(i => i != itemId);
      await game.settings.set("trued6", "startingEquipment", listItems);

      li.slideUp(200, () => this.render(false));
    });
  }

  async _onDrop(event) {
    let data;
    console.log(event);
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    }
    catch (err) {
      return false;
    }
    if (data.type != "Item")
    return false;

    const item = await fromUuid(data.uuid);
    let listItems = game.settings.get("trued6", "startingEquipment");
    listItems.push(item._id);
    await game.settings.set("trued6", "startingEquipment", listItems);
    this.render(false);
  }
}