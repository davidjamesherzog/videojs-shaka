import type Player from 'video.js/dist/types/player';
import {MenuItem as VjsMenuItem} from '../videojs-classes';
import type {QualitySwitchCallback} from '../types';

export interface QualityMenuItemOptions {
  id: number;
  label: string;
  selected: boolean;
  selectable: boolean;
  trackType: string;
  qualitySwitchCallback: QualitySwitchCallback;
}

class QualityMenuItem extends VjsMenuItem {

  constructor(player: Player, options: QualityMenuItemOptions) {
    super(player, options);
  }

  handleClick(event: Event) {
    super.handleClick(event);

    this.player_.trigger('qualitytrackchange', this.options_);
    this.options_.qualitySwitchCallback(this.options_.id, this.options_.trackType);
  }
}

export default QualityMenuItem;
