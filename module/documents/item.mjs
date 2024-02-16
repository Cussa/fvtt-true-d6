/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class Trued6Item extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  async updateUsage(roll) {
    console.log(roll, this);
    if (!["skill", "spell"].includes(this.type) || this.system.usageType == "none")
      return;

    if (this.system.usageType == "rest") {
      this.update({ "system.whenRestUsed": true });
      return;
    }

    if (this.system.usageType == "fail" && roll?.total == 0) {
      this.update({ "system.whenFailedUsed": true });
      return;
    }
  }
}
