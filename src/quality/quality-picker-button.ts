import type Player from 'video.js/dist/types/player';
import {MenuButton as VjsButton} from '../videojs-classes';
import type {QualityEntry, QualitySwitchCallback} from '../types';
import QualityMenu from './quality-menu';
import QualityMenuItem from './quality-menu-item';

const TRACK_CLASS: Record<string, string> = {
  video: 'vjs-icon-hd',
  audio: 'vjs-icon-cog',
  subtitle: 'vjs-icon-subtitles'
};

export interface QualityPickerButtonOptions {
  name: string;
  qualityList: QualityEntry[];
  qualitySwitchCallback: QualitySwitchCallback;
  trackType: string;
}

class QualityPickerButton extends VjsButton {

  constructor(player: Player, options: QualityPickerButtonOptions) {
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
      console.log(menuItem);
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
