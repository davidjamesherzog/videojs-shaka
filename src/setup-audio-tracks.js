import videojs from 'video.js';
import {audioTrackLabel, uiLanguageOf} from './track-label';

/**
 * Shaka Player reports one audio track per audio stream, so a language that is
 * offered in several codecs (e.g. AAC and Opus) or bitrates shows up more than
 * once. Collapse those down to one entry per viewer facing choice (language,
 * roles, channel layout and any meaningful label), the way shaka's old
 * `getAudioLanguagesAndRoles()` did, preferring the active stream.
 *
 * @param {shaka.extern.AudioTrack[]} tracks
 *        The audio tracks reported by shaka player.
 *
 * @param {string} [uiLanguage]
 *        The player's UI language, used to build the labels.
 *
 * @return {shaka.extern.AudioTrack[]}
 *         One track per distinct choice.
 */
export function dedupeAudioTracks(tracks, uiLanguage) {
  const byKey = {};
  const result = [];

  tracks.forEach((track) => {
    // the label already folds in language, non-default roles and channel layout
    const key = [track.language, audioTrackLabel(track, uiLanguage)].join('|');
    const existingIndex = byKey[key];

    if (existingIndex === undefined) {
      byKey[key] = result.length;
      result.push(track);
    } else if (track.active && !result[existingIndex].active) {
      result[existingIndex] = track;
    }
  });

  return result;
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
  const uiLanguage = uiLanguageOf(tech);

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
      label: audioTrackLabel(shakaTrack, uiLanguage),
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
  handleAudioTracksAdded(tech, shakaPlayer, dedupeAudioTracks(shakaPlayer.getAudioTracks(), uiLanguageOf(tech)));
}
