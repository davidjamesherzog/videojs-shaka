function _getQuality(tech, shakaPlayer) {

  const tracks = [];
  const levels = shakaPlayer.getVariantTracks().filter(function(t) {
    return t.type === 'variant';
  });

  if (levels.length > 1) {

    const autoLevel = {
      id: -1,
      label: 'auto',
      selected: true
    };

    tracks.push(autoLevel);
  }

  levels.forEach(function(level, index) {

    const track = level;

    let label = '';
    if (level.height >= 2160) {
      label = ' (4k)';
    } else if (level.height >= 1440) {
      label = ' (2k)';
    } else if (level.height >= 720) {
      label = ' (HD)';
    }
    track.label = level.height + 'p' + label;

    tracks.push(track);
  });

  // group tracks by langugage b/c we will need to only display the tracks associated with the current audio track
  const sortedTracks = tracks
    .sort((track1, track2) => {
      if (track1.language > track2.language) {
        return -1;
      }
      if (track2.language > track1.language) {
        return 1;
      }
      if (track1.height > track2.height) {
        return -1;
      }
      if (track2.height > track1.height) {
        return 1;
      }
      if (track1.bandwidth > track2.bandwidth) {
        return -1;
      }
      if (track2.bandwidth > track1.bandwidth) {
        return 1;
      }
      return 0;
    })
    .reduce((accumulator, track) => {
      if (track.height !== accumulator.previousHeight ||
        (track.height === accumulator.previousHeight && track.language !== accumulator.previousLanguage)) {
        accumulator.previousHeight = track.height;
        accumulator.previousLanguage = track.language;
        accumulator.list.push(track);
      }
      return accumulator;
    }, { previousHeight: null, previousLanguage: null, list: [] }).list;

  return sortedTracks;
}

export default function setupQualityTracks(tech, shakaPlayer) {

  tech.trigger('loadedqualitydata', {
    qualityData: {
      video: _getQuality(tech, shakaPlayer)
    },
    qualitySwitchCallback: function(id, type) {

      // Update the adaptation.
      shakaPlayer.configure({
        abr: {
          enabled: id === -1
        }
      });

      // Is auto?
      if (id === -1) return;

      const tracks = shakaPlayer.getVariantTracks().filter(function(t) {
        return t.id === id && t.type === 'variant';
      });

      shakaPlayer.selectVariantTrack(tracks[0], /* clearBuffer */ true);

      // fire `variantchanged` event - only supports debug mode right now
      // todo - need to figure out how to do this in non debug mode
      if (shaka.util.FakeEvent) {
        const event = new shaka.util.FakeEvent('variantchanged');
        shakaPlayer.dispatchEvent(event);
      }
    }
  });
}
