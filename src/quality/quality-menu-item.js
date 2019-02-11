import videojs from 'video.js';

const VjsMenuItem = videojs.getComponent('MenuItem');

class QualityMenuItem extends VjsMenuItem {

  handleClick() {
      super.handleClick();

      this.options_.qualitySwitchCallback(this.options_.id, this.options_.trackType);
  }
}

export default QualityMenuItem;
