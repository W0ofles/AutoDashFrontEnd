import * as PIXI from "pixi.js";
import { GlowFilter } from "@pixi/filter-glow";
import Renderable from "./Renderable";
import { gsap } from "gsap";
//Aliases
let Graphics = PIXI.Graphics;

const BAR_MAX = 100;
const BAR_MIN = 0;
/**
 * Just a rising/lowering Bar.
 * @class BarGraph 0 - 100
 */
class BarGraph extends Renderable {

  constructor({ renderer, theme, width, height, maxValue=BAR_MAX}) {
    super({ renderer, theme });
    this.activeColor = theme.gaugeActiveColor;
    this.backgroundColor = theme.gaugeBgColor;
    this._value = maxValue;
    this.renderedValue = this._value;
    this.gaugeHeight = height;
    this.gaugeWidth = width;
    this.maxValue = maxValue;
    this.gsapTimeline = gsap.timeline();
  }

  set value(newValue) {
    this._value = Math.min(Math.max(newValue || BAR_MIN), BAR_MAX);
  }

  initialize() {
    const background = new Graphics();
    background
      .beginFill(this.backgroundColor)
      .lineStyle(0)
      .drawRect(0, 0, this.gaugeWidth, this.gaugeHeight)
      .endFill();
    this.addChild(background);

    this.gaugeActive = new Graphics();
    this.gaugeActive
      .beginFill(this.activeColor)
      .lineStyle(0)
      .drawRect(0, 0, this.gaugeWidth, this.gaugeHeight)
      .endFill();
    this.addChild(this.gaugeActive);

    // set the rotate this puppy so we can scale it up and down
    this.gaugeActive.position.set(this.gaugeWidth, this.gaugeHeight);
    this.gaugeActive.angle = 180;

    this.gaugeActive.filters = [
      new GlowFilter({
        distance: 8,
        outerStrength: 1,
        innerStrength: 0,
        // color: 0xf0f0f0,
        color: this.theme.gaugeActiveColor,
        quality: 0.2,
      }),
    ];

    PIXI.Ticker.shared.addOnce(() => {
      // bake in the final transform area
      this.gaugeActive.filterArea = this.getBounds();
    });
  }

  update() {
    if (this._value != this.renderedValue) {
      this.gsapTimeline.clear();
      this.gsapTimeline.to(this.gaugeActive.scale, {duration: 0.15, y: this._value / this.maxValue})
      this.renderedValue = this._value;
    }
  }
}

export default BarGraph;