import videojs from 'video.js';

// the video.js typings do not describe the subclassable surface of components
const VjsMenuItem = videojs.getComponent('MenuItem') as any;

class QualityMenuItem extends VjsMenuItem {

  constructor(player: any, options: unknown) {
    super(player, options);
  }

  handleClick() {
    super.handleClick();

    this.player_.trigger('qualitytrackchange', this.options_);
    this.options_.qualitySwitchCallback(this.options_.id, this.options_.trackType);
  }
}

export default QualityMenuItem;
