import videojs from 'video.js';
import QualityMenu from './quality-menu';
import QualityMenuItem from './quality-menu-item';

const VjsButton = videojs.getComponent('MenuButton');

const TRACK_CLASS = {
  video: 'vjs-icon-hd',
  audio: 'vjs-icon-cog',
  subtitle: 'vjs-icon-subtitles'
};

class QualityPickerButton extends VjsButton {

  constructor(player, options) {
    super(player, options);
  }

  createMenu() {
    const menu = new QualityMenu(this.player_, this.options_);
    let menuItem;
    let options;
    for (let i = 0; i < this.options_.qualityList.length; i++) {
      const quality = this.options_.qualityList[i];
      const {qualitySwitchCallback, trackType} = this.options_;
      options = Object.assign({qualitySwitchCallback, trackType}, quality, { selectable: true });

      menuItem = new QualityMenuItem(this.player_, options);
      menu.addItem(menuItem);
    }

    return menu;
  }

  buildCSSClass() {
    return `vjs-quality-button ${TRACK_CLASS[this.options_.trackType]} vjs-icon-placeholder ${super.buildCSSClass()}`;
  }

  buildWrapperCSSClass() {
    return `vjs-quality-button ${super.buildWrapperCSSClass()}`;
  }

}

export default QualityPickerButton;
