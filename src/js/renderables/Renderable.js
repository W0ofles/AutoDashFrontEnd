import * as PIXI from "pixi.js";

//Aliases
let Container = PIXI.Container;

export default class Renderable extends Container {
  constructor({ renderer, theme }) {
    super();
    this._dashID = null;
    this.interactiveChildren = false;
    /** @type {PIXI.Renderer} */
    this.appRenderer = renderer;
    this.theme = theme;

    // Value to be rendered
    this._value = null;

    // What value the gauge rendered last
    this.renderedValue = this._value;
  }

  get dashID() {
    return this._dashID;
  }

  get value() {
    return this._value;
  }
  set value(newValue) {}
  initialize() {}
  update() {}
}
