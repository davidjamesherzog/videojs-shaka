/**
 * Build the list of selectable video qualities from shaka's variant tracks.
 *
 * @param {shaka.Player} shakaPlayer
 *        The shaka player instance.
 *
 * @return {Object[]}
 *         Quality entries, including an `auto` entry with id `-1` when more
 *         than one quality exists.
 *
 * @private
 */
function getQuality(shakaPlayer) {

  const tracks = [];
  const levels = shakaPlayer.getVariantTracks().filter((t) => t.type === 'variant' && t.height);

  if (levels.length > 1) {
    tracks.push({
      id: -1,
      label: 'auto',
      selected: true
    });
  }

  levels.forEach((level) => {
    let label = '';

    if (level.height >= 2160) {
      label = ' (4k)';
    } else if (level.height >= 1440) {
      label = ' (2k)';
    } else if (level.height >= 720) {
      label = ' (HD)';
    }

    tracks.push(Object.assign({}, level, {label: level.height + 'p' + label}));
  });

  // group tracks by language b/c we will need to only display the tracks associated with the current audio track
  return tracks
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
}

/**
 * Publish the available video qualities to the quality picker and wire up
 * quality switching.
 *
 * @param {Tech} tech
 *        The video.js tech being used.
 *
 * @param {shaka.Player} shakaPlayer
 *        The shaka player instance.
 */
export default function setupQualityTracks(tech, shakaPlayer) {

  tech.trigger('loadedqualitydata', {
    qualityData: {
      video: getQuality(shakaPlayer)
    },
    qualitySwitchCallback(id, type) {

      // Update the adaptation.
      shakaPlayer.configure({
        abr: {
          enabled: id === -1
        }
      });

      // Is auto?
      if (id === -1) {
        return;
      }

      const track = shakaPlayer.getVariantTracks().find((t) => t.id === id && t.type === 'variant');

      // shaka fires `variantchanged` itself for manual selections
      if (track) {
        const clearBuffer = true;

        shakaPlayer.selectVariantTrack(track, clearBuffer);
      }
    }
  });
}
