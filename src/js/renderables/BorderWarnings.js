import * as PIXI from "pixi.js";
import { SCREEN } from "../appConfig";
import Renderable from "./Renderable";
import { RENDER_KEYS } from "./Renderables";
import { DATA_KEYS, WARNING_KEYS } from "../common/dataMap";
import { gsap } from "gsap";

//Aliases
let Graphics = PIXI.Graphics;

const ID = RENDER_KEYS.WARNING_BORDER;
   
const tagRctSize = 54;
const tagBump = tagRctSize*.1;
const tagWidth = tagRctSize + tagBump;
const TAG_BORDER_WIDTH = 4;

const _createTagGeometry = (backgroundColor, lineColor) => {
  const gfx = new Graphics();
  gfx
    .beginFill(backgroundColor)
    .lineStyle({width:TAG_BORDER_WIDTH, color: lineColor })
    .drawPolygon([
      0, 0,       // tag edge
      tagRctSize, 0,
      tagRctSize, tagRctSize,
      tagBump, tagRctSize,
      0,tagRctSize-tagBump,
    ])
    .endFill();
  return gfx;
}

class BorderWarnings extends Renderable {
  constructor({ renderer, theme }) {
    super({ renderer, theme });
    this._dashID = ID;
    this.theme = theme; //#FFAE42
    this._value = 0xff;
    this.renderedValue = 0;
    this.borders = [];
    this.tags = {}
  }

  get gaugeWidth() {
    return SCREEN.WIDTH;
  }
  get gaugeHeight() {
    return SCREEN.HEIGHT;
  }
  valueOf(mask) {
    return !!(this._value & (128 >> mask % 8));
  }

  set value(dataSet) {
    this._value = dataSet[DATA_KEYS.WARNINGS];
  }

  createTag(tint, texture) {
    const renderContainer = new PIXI.Container();
    const tagGeomtry = _createTagGeometry(this.theme.backgroundColor, tint);

    let background = _createTagGeometry(tint, 0xffffff);
    let tx = new PIXI.Sprite(texture);
    tx.anchor.set(0.5);
    tx.setTransform(tagRctSize/2,tagRctSize/2,0.6,0.6,0, 0, 0,0,0); // TODO: reduce actual texture sizes and then remove scaling code
    background.mask = tx;
    background.addChild(tx);

    renderContainer.addChild(tagGeomtry, background);
    const renderTexture = this.appRenderer.generateTexture(renderContainer);
    const tag = new PIXI.Sprite(renderTexture);
    renderContainer.destroy({children: true}); // clean up

    tag.x = SCREEN.WIDTH - 5;
    tag.y = SCREEN.BORDER_WIDTH - 5 - TAG_BORDER_WIDTH;
    return {tag: tag, borderColor: tint};  
  }

  initialize() {
    // draw initial border geometry
    const vert = new Graphics();
    const horz = new Graphics();

    vert
      .beginFill(0xffffff)
      .lineStyle(0)
      .drawRect(0, 0, SCREEN.BORDER_WIDTH-5, this.gaugeHeight)
      .endFill();
    horz
      .beginFill(0xffffff)
      .lineStyle(0)
      .drawRect(0, 0, this.gaugeWidth, SCREEN.BORDER_WIDTH-5)
      .endFill(); 

    // left top
    this.borders = [
      horz,
      vert,
      new Graphics(horz.geometry),
      new Graphics(vert.geometry),
    ]
    this.borders[2].y = this.gaugeHeight - SCREEN.BORDER_WIDTH + 5;
    this.borders[3].x = this.gaugeWidth - SCREEN.BORDER_WIDTH + 5;
    
    const gpsErrorTag = this.createTag(0xff7c00, PIXI.utils.TextureCache["GPS_error.png"]);
    const gpsNotAcquiredTag = this.createTag(0x00FF00, PIXI.utils.TextureCache["GPS_no_signal.png"]);
    const commErrorTag = this.createTag(this.theme.dangerColor, PIXI.utils.TextureCache["warning.png"]);
    const batteryTag = this.createTag(0xFFAE42, PIXI.utils.TextureCache["battery.png"]);
    const fuelTag = this.createTag(0xFFEB00, PIXI.utils.TextureCache["fuel.png"]);
    const oilTag = this.createTag(this.theme.dangerColor, PIXI.utils.TextureCache["oil.png"]);
    const tempTag = this.createTag(this.theme.dangerColor, PIXI.utils.TextureCache["temp.png"]);
    
    // order of severity  //(128 >> i % 8)
    this.tags = {
      commError: { mask: WARNING_KEYS.ECU_COMM, tag: commErrorTag.tag,                   borderColor: commErrorTag.borderColor, tl: gsap.timeline()},
      lowFuel: { mask: WARNING_KEYS.LOW_FUEL, tag: fuelTag.tag,                          borderColor: fuelTag.borderColor, tl: gsap.timeline()},
      oil: { mask: WARNING_KEYS.OIL_PRESSURE, tag: oilTag.tag,                           borderColor: oilTag.borderColor, tl: gsap.timeline()},
      temp: { mask: WARNING_KEYS.ENGINE_TEMPERATURE, tag: tempTag.tag,                   borderColor: tempTag.borderColor, tl: gsap.timeline()},
      gpsError: { mask: WARNING_KEYS.GPS_ERROR, tag: gpsErrorTag.tag,                    borderColor: gpsErrorTag.borderColor, tl: gsap.timeline()},
      battery: { mask: WARNING_KEYS.BATT_VOLTAGE, tag: batteryTag.tag,                   borderColor: batteryTag.borderColor, tl: gsap.timeline()},
      gpsNotAcquired: { mask: WARNING_KEYS.GPS_NOT_ACQUIRED, tag: gpsNotAcquiredTag.tag, borderColor: gpsNotAcquiredTag.borderColor, tl: gsap.timeline()},
    }

    // reminder: last added is the last drawn (painters algorithm)
    Object.values(this.tags).map(d => d.tag).reverse().forEach((g) => this.addChild(g));
    this.addChild(...this.borders);
  }

  // TODO: Clean all this up buddy, jeez

  // TODO:  if comm error; only show that warning since we know nowthing else?  or dim the rest??
  //        GPS:  if gps error; dont show other GPS warnings

  update() {
    if (this._value != this.renderedValue) {
      // this only gets called if there is a change; so iterate through all tags
      // and send them to their new spots
      let offset = 0;
      let currentTint = null;
      for (const [key, tagData] of Object.entries(this.tags)) {
        if (this.valueOf(tagData.mask)) {
          if (!currentTint) currentTint = tagData.borderColor;
          tagData.tl.clear();
          tagData.tl.to(tagData.tag, { 
            x: (SCREEN.WIDTH - tagWidth - offset - 5), duration: 0.7, 
                onStart:() => {
                  tagData.tag.renderable = true; 
                },
                onComplete: () => {} 
            });
          offset += (tagRctSize - 2);
        } else {
          tagData.tl.clear();
          tagData.tl.to(tagData.tag, { 
            x: SCREEN.WIDTH, duration: 1, 
            onStart:() => {},
            onComplete: () => {
              tagData.tag.renderable = false;
              if (!this._value) this.renderable = false;  
            } 
        });
        }
      }

      if (this._value) {
        this.renderable = true;
        // make sure the border takes on the issue with the highest priority/severity
        this.borders.forEach(gfx => gfx.tint = currentTint);
      }

      this.renderedValue = this._value;
    }
  }
}

BorderWarnings.ID = ID;
export default BorderWarnings;