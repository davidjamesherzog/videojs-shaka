import videojs from 'video.js';

/**
 * Build a human readable label for a shaka audio track.
 *
 * @param {shaka.extern.AudioTrack} track
 *        The shaka audio track.
 *
 * @return {string}
 *         A label such as `en` or `en (description)`.
 */
function generateLabelFromTrack(track) {
  if (track.label) {
    return track.label;
  }

  let label = track.language;
  const roles = (track.roles || []).filter((role) => role !== 'main');

  if (roles.length) {
    label += ` (${roles.join(', ')})`;
  }

  return label;
}

/**
 * Setup audio tracks. Take the audio tracks from shaka player and add them to
 * video.js. Listen for when video.js changes tracks and apply that to shaka
 * player because video.js doesn't do this natively.
 *
 * @private
 * @param {Tech} tech
 *        The video.js tech being used.
 *
 * @param {shaka.Player} shakaPlayer
 *        The shaka player instance.
 *
 * @param {shaka.extern.AudioTrack[]} tracks
 *        The audio tracks reported by shaka player.
 */
function handleAudioTracksAdded(tech, shakaPlayer, tracks) {

  const videojsAudioTracks = tech.audioTracks();

  // Safari creates a single native `AudioTrack` (not `videojs.AudioTrack`) when loading. Clear all
  // automatically generated audio tracks so we can create them all ourself.
  if (videojsAudioTracks.length) {
    tech.clearTracks(['audio']);
  }

  const currentAudioTrack = tracks.find((track) => track.active) || tracks[0];

  // map the video.js track id back to the shaka track it was created from
  const trackDictionary = {};

  tracks.forEach((shakaTrack, index) => {
    const id = `shaka-audio-${index}`;
    const enabled = shakaTrack === currentAudioTrack;

    trackDictionary[id] = shakaTrack;

    if (enabled) {
      tech.trigger('shakaaudiotrackchange', {
        language: shakaTrack.language
      });
    }

    // Add the track to the player's audio track list.
    videojsAudioTracks.addTrack(new videojs.AudioTrack({
      enabled,
      id,
      kind: 'main',
      label: generateLabelFromTrack(shakaTrack),
      language: shakaTrack.language
    }));
  });

  const audioTracksChangeHandler = () => {
    for (let i = 0; i < videojsAudioTracks.length; i++) {
      const track = videojsAudioTracks[i];

      if (!track.enabled) {
        continue;
      }

      // Find the shaka track that matches the video.js track we just selected
      const shakaTrack = trackDictionary[track.id];

      if (shakaTrack && !shakaTrack.active) {
        tech.trigger('shakaaudiotrackchange', {
          language: shakaTrack.language
        });
        shakaPlayer.selectAudioTrack(shakaTrack);
      }
    }
  };

  videojsAudioTracks.addEventListener('change', audioTracksChangeHandler);
  shakaPlayer.addEventListener('unloading', () => {
    videojsAudioTracks.removeEventListener('change', audioTracksChangeHandler);
  });
}

/**
 * Mirror shaka player's audio tracks into the video.js audio track list.
 *
 * @param {Tech} tech
 *        The video.js tech being used.
 *
 * @param {shaka.Player} shakaPlayer
 *        The shaka player instance.
 */
export default function setupAudioTracks(tech, shakaPlayer) {
  handleAudioTracksAdded(tech, shakaPlayer, shakaPlayer.getAudioTracks());
}
