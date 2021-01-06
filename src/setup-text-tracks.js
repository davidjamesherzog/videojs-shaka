function find(l, f) {
  for (let i = 0; i < l.length; i++) {
    if (f(l[i])) {
      return l[i];
    }
  }
}

/*
 * Attach text tracks from dash.js to videojs
 *
 * @param {videojs} tech the videojs player tech instance
 * @param {array} tracks the tracks loaded by dash.js to attach to videojs
 *
 * @private
 */
function attachDashTextTracksToVideojs(tech, shakaPlayer, tracks) {

  const trackDictionary = [];

  // Add remote tracks
  const tracksAttached = tracks
    // Map input data to match HTMLTrackElement spec
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLTrackElement
    .map((track) => ({
      dashTrack: track,
      trackConfig: {
        label: track.label || track.language,
        language: track.language,
        srclang: track.language,
        kind: track.kind
      }
    }))

    // Add track to videojs track list
    .map(({trackConfig, dashTrack}) => {
      const remoteTextTrack = tech.addRemoteTextTrack(trackConfig, false);

      trackDictionary.push({textTrack: remoteTextTrack.track, dashTrack});

      // Don't add the cues becuase we're going to let dash handle it natively. This will ensure
      // that dash handle external time text files and fragmented text tracks.
      //
      // Example file with external time text files:
      // https://storage.googleapis.com/shaka-demo-assets/sintel-mp4-wvtt/dash.mpd

      return remoteTextTrack;
    });

  /*
   * Scan `videojs.textTracks()` to find one that is showing. Set the dash text track.
   */
  function updateActiveDashTextTrack() {

    let dashTrackToActivate;
    const textTracks = tech.textTracks();

    // Iterate through the tracks and find the one marked as showing. If none are showing,
    // disable text tracks.
    for (let i = 0; i < textTracks.length; i += 1) {
      const textTrack = textTracks[i];

      if (textTrack.mode === 'showing') {
        // Find the dash track we want to use

        /* jshint loopfunc: true */
        const dictionaryLookupResult = find(trackDictionary,
          (track) => track.textTrack === textTrack);
        /* jshint loopfunc: false */

        dashTrackToActivate = dictionaryLookupResult ?
          dictionaryLookupResult.dashTrack :
          null;
      }
    }

    // If the text track has changed, then set it in shaka
    if (dashTrackToActivate) {
      shakaPlayer.selectTextTrack(dashTrackToActivate);
      shakaPlayer.setTextTrackVisibility(true);
    } else {
      shakaPlayer.setTextTrackVisibility(false);
    }

  }

  // Update dash when videojs's selected text track changes.
  tech.textTracks().on('change', updateActiveDashTextTrack);

  // Cleanup event listeners whenever we start loading a new source
  shakaPlayer.addEventListener('unloading', () => {
    tech.textTracks().off('change', updateActiveDashTextTrack);
  });

  // Initialize the text track on our first run-through
  updateActiveDashTextTrack();

  return tracksAttached;
}

export default function setupTextTracks(tech, shakaPlayer) {

  // Store the tracks that we've added so we can remove them later.
  let dashTracksAttachedToVideoJs = [];

  // Clear the tracks that we added. We don't clear them all because someone else can add tracks.
  function clearDashTracks() {
    dashTracksAttachedToVideoJs.forEach(tech.removeRemoteTextTrack.bind(tech));

    dashTracksAttachedToVideoJs = [];
  }

  function handleTextTracksAdded(tracks) {

    // Cleanup old tracks
    clearDashTracks();

    // Don't try to add text tracks if there aren't any or if the app is sideloading webvtt files
    if (!tracks.length || tech.options_.sideload) {
      shakaPlayer.setTextTrackVisibility(false);
      return;
    }

    // Save the tracks so we can remove them later
    dashTracksAttachedToVideoJs = attachDashTextTracksToVideojs(tech, shakaPlayer, tracks);
  }

  handleTextTracksAdded(shakaPlayer.getTextTracks());

}
