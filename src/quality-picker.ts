import type Player from 'video.js/dist/types/player';
import QualityPickerButton from './quality/quality-picker-button';
import type {QualityData, QualitySwitchCallback} from './types';

interface LoadedQualityData {
  qualityData: QualityData;
  qualitySwitchCallback: QualitySwitchCallback;
}

export default function qualityPickerPlugin(this: Player) {
  // the video.js typings do not expose `tech_` or `controlBar` children by name
  const player = this as any;

  const SUPPORTED_TRACKS = ['video', 'audio', 'subtitle'] as const;

  // On later versions `player.tech` is undefined before this...
  if (player.tech_) {
    player.tech_.on('loadedqualitydata', onQualityData);
  } else {
    player.ready(function() {
      player.tech_.on('loadedqualitydata', onQualityData);
    }, true);
  }

  function onQualityData(event: unknown, {qualityData, qualitySwitchCallback}: LoadedQualityData) {
    const fullscreenToggle = player.controlBar.getChild('fullscreenToggle');

    player.controlBar.removeChild(fullscreenToggle);

    for (let i = 0; i < SUPPORTED_TRACKS.length; i++) {
      const track = SUPPORTED_TRACKS[i];
      let name = track + 'PickerButton';
      // videojs.utils.toTitleCase

      name = name.charAt(0).toUpperCase() + name.slice(1);

      let qualityPickerButton = player.controlBar.getChild(name);

      if (qualityPickerButton) {
        qualityPickerButton.dispose();
        player.controlBar.removeChild(qualityPickerButton);
      }

      const qualityList = qualityData[track];

      if (qualityList && qualityList.length > 1) {
        qualityPickerButton = new QualityPickerButton(player, {name, qualityList, qualitySwitchCallback, trackType: track});

        player.controlBar.addChild(qualityPickerButton);
      }
    }

    if (fullscreenToggle) {
      player.controlBar.addChild(fullscreenToggle);
    }
  }
}
