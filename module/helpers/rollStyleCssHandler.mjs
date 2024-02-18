export class RollStyleCssHandler {
  shiftKey = false;
  altKey = false;

  rollable = ".rollable";
  advantageClass = "advantage";
  disadvantageClass = "disadvantage";

  registerHandler() {
    const handler = this;
    $(document).on('keydown', function (e) {
      handler._toggleClass(e);
    });

    $(document).on('keyup', function (e) {
      handler._toggleClass(e);
    });
  }

  _toggleClass(e) {
    if (e.target.nodeName == "INPUT")
      return;

    this.altKey = e.altKey;
    this.shiftKey = e.shiftKey;

    if ((this.altKey && this.shiftKey) ||
      (!this.altKey && !this.shiftKey)) {
      $(this.rollable).removeClass(this.advantageClass);
      $(this.rollable).removeClass(this.disadvantageClass);
    }
    else if (this.shiftKey) {
      $(this.rollable).addClass(this.advantageClass);
    }
    else if (this.altKey) {
      $(this.rollable).addClass(this.disadvantageClass);
    }
  }
}

