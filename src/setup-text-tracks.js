import {textTrackLabel, uiLanguageOf} from './track-label';

/**
 * Select a shaka text track, or hide text entirely when `track` is falsy.
 *
 * Shaka Player 5 removed `setTextTrackVisibility()`; selecting a track shows
 * it and passing `null` hides text. Shaka Player 4 still needs the explicit
 * visibility call, so support both.
 *
 * @param {shaka.Player} shakaPlayer
 *        The shaka player instance.
 *
 * @param {shaka.extern.TextTrack|null} track
 *        The shaka text track to show, or `null` to hide text.
 */
function selectShakaTextTrack(shakaPlayer, track) {
  if (track) {
    shakaPlayer.selectTextTrack(track);
  }

  if (typeof shakaPlayer.setTextTrackVisibility === 'function') {
    shakaPlayer.setTextTrackVisibility(!!track);
  } else if (!track) {
    shakaPlayer.selectTextTrack(null);
  }
}

/**
 * Attach text tracks from shaka player to video.js
 *
 * @param {Tech} tech
 *        The video.js tech being used.
 *
 * @param {shaka.Player} shakaPlayer
 *        The shaka player instance.
 *
 * @param {shaka.extern.TextTrack[]} tracks
 *        The text tracks loaded by shaka player to attach to video.js
 *
 * @return {Object[]}
 *         The remote text tracks that were added to video.js.
 *
 * @private
 */
function attachShakaTextTracksToVideojs(tech, shakaPlayer, tracks) {

  // also read by `VideojsTextDisplayer` to find the track that receives cues
  const trackDictionary = tech.shakaTextTracks_ = [];
  const uiLanguage = uiLanguageOf(tech);

  // Add remote tracks
  const tracksAttached = tracks
    // Map input data to match HTMLTrackElement spec
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLTrackElement
    .map((track) => ({
      shakaTrack: track,
      trackConfig: {
        label: textTrackLabel(track, uiLanguage),
        language: track.language,
        srclang: track.language,
        kind: track.kind || 'subtitles'
      }
    }))

    // Add track to videojs track list
    .map(({trackConfig, shakaTrack}) => {
      const remoteTextTrack = tech.addRemoteTextTrack(trackConfig, false);

      trackDictionary.push({textTrack: remoteTextTrack.track, shakaTrack});

      // Don't add the cues because we're going to let shaka handle it natively. This will ensure
      // that shaka handles external timed text files and fragmented text tracks.
      //
      // Example file with external timed text files:
      // https://storage.googleapis.com/shaka-demo-assets/sintel-mp4-wvtt/dash.mpd

      return remoteTextTrack;
    });

  /*
   * Scan `videojs.textTracks()` to find one that is showing. Set the shaka text track.
   */
  function updateActiveShakaTextTrack() {

    let shakaTrackToActivate = null;
    const textTracks = tech.textTracks();

    // Iterate through the tracks and find the one marked as showing. If none are showing,
    // disable text tracks.
    for (let i = 0; i < textTracks.length; i += 1) {
      const textTrack = textTracks[i];

      if (textTrack.mode === 'showing') {
        // Find the shaka track we want to use
        const dictionaryLookupResult = trackDictionary.find((track) => track.textTrack === textTrack);

        shakaTrackToActivate = dictionaryLookupResult ? dictionaryLookupResult.shakaTrack : null;
      }
    }

    selectShakaTextTrack(shakaPlayer, shakaTrackToActivate);
  }

  // Update shaka when videojs's selected text track changes.
  tech.textTracks().on('change', updateActiveShakaTextTrack);

  // Cleanup event listeners whenever we start loading a new source
  shakaPlayer.addEventListener('unloading', () => {
    tech.textTracks().off('change', updateActiveShakaTextTrack);
  });

  // Initialize the text track on our first run-through
  updateActiveShakaTextTrack();

  return tracksAttached;
}

/**
 * Mirror shaka player's text tracks into the video.js text track list.
 *
 * @param {Tech} tech
 *        The video.js tech being used.
 *
 * @param {shaka.Player} shakaPlayer
 *        The shaka player instance.
 */
export default function setupTextTracks(tech, shakaPlayer) {

  // Store the tracks that we've added so we can remove them later.
  let shakaTracksAttachedToVideoJs = [];

  // Clear the tracks that we added. We don't clear them all because someone else can add tracks.
  function clearShakaTracks() {
    shakaTracksAttachedToVideoJs.forEach(tech.removeRemoteTextTrack.bind(tech));

    shakaTracksAttachedToVideoJs = [];
    tech.shakaTextTracks_ = [];
  }

  function handleTextTracksAdded(tracks) {

    // Cleanup old tracks
    clearShakaTracks();

    // Don't try to add text tracks if there aren't any or if the app is sideloading webvtt files
    if (!tracks.length || tech.options_.sideload) {
      selectShakaTextTrack(shakaPlayer, null);
      return;
    }

    // Save the tracks so we can remove them later
    shakaTracksAttachedToVideoJs = attachShakaTextTracksToVideojs(tech, shakaPlayer, tracks);
  }

  handleTextTracksAdded(shakaPlayer.getTextTracks());

}
