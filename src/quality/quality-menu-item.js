import videojs from 'video.js';

const VjsMenuItem = videojs.getComponent('MenuItem');

class QualityMenuItem extends VjsMenuItem {

  handleClick() {
    super.handleClick();

    this.player_.trigger('qualitytrackchange', this.options_);
    this.options_.qualitySwitchCallback(this.options_.id, this.options_.trackType);
  }
}

export default QualityMenuItem;
