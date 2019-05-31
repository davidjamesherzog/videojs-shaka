function _getQuality(tech, shaka) {

  const tracks = [];
  const levels = shaka.getVariantTracks().filter(function(t) {
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

export default function setupQualityTracks(tech, shaka) {

  tech.trigger('loadedqualitydata', {
    qualityData: {
      video: _getQuality(tech, shaka)
    },
    qualitySwitchCallback: function(id, type) {

      // Update the adaptation.
      shaka.configure({
        abr: {
          enabled: id === -1
        }
      });

      // Is auto?
      if (id === -1) return;

      const tracks = shaka.getVariantTracks().filter(function(t) {
        return t.id === id && t.type === 'variant';
      });

      shaka.selectVariantTrack(tracks[0], /* clearBuffer */ true);
    }
  });
}
