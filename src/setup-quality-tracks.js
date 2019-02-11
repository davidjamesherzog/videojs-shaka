function _getQuality(player, shaka) {

  const tracks = [],
    levels = shaka.getVariantTracks().filter(function(t) {
      return t.type === 'variant'
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

    track.label = level.height + 'p (' + ((level.bandwidth / 1000).toFixed(0)) + 'k)';

    tracks.push(track);
  });

  tracks.sort((track1, track2) => {
    return track1.height - track2.height;
  });

  return tracks;
}

export default function setupQualityTracks(player, shaka) {

  const me = this;

  player.trigger('loadedqualitydata', {
    qualityData: {
      video: _getQuality(player, shaka)
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
        return t.id === id && t.type === 'variant'
      });

      shaka.selectVariantTrack(tracks[0], /* clearBuffer */ true);
    }
  });
}
