import videojs from 'video.js';

/**
 * Setup audio tracks. Take the tracks from dash and add the tracks to videojs. Listen for when
 * videojs changes tracks and apply that to the dash player because videojs doesn't do this
 * natively.
 *
 * @private
 * @param {videojs} player the videojs player instance
 * @param {videojs.tech} tech the videojs tech being used
 */
function handleAudioTracksAdded(player, shaka, tracks) {

  const videojsAudioTracks = player.audioTracks();

  function generateIdFromTrackIndex(index) {
    return `dash-audio-${index}`;
  }

  function generateLabelFromTrack(track) {
    let label = track.language;

    if (track.role) {
      label += ` (${track.role})`;
    }

    return label;
  }

  function findDashAudioTrack(subDashAudioTracks, videojsAudioTrack) {
    return subDashAudioTracks.find((track) =>
      generateLabelFromTrack(track) === videojsAudioTrack.label
    );
  }

  // Safari creates a single native `AudioTrack` (not `videojs.AudioTrack`) when loading. Clear all
  // automatically generated audio tracks so we can create them all ourself.
  if (videojsAudioTracks.length) {
    tech.clearTracks(['audio']);
  }

  const currentAudioTrack = tracks[0];

  tracks.forEach((dashTrack, index) => {
    const label = generateLabelFromTrack(dashTrack);

    // Add the track to the player's audio track list.
    videojsAudioTracks.addTrack(
      new videojs.AudioTrack({
        enabled: dashTrack === currentAudioTrack,
        id: generateIdFromTrackIndex(index),
        kind: 'main',
        label,
        language: dashTrack.language
      })
    );
  });

  const audioTracksChangeHandler = () => {
    for (let i = 0; i < videojsAudioTracks.length; i++) {
      const track = videojsAudioTracks[i];

      if (track.enabled) {
        // Find the audio track we just selected by the id
        const dashAudioTrack = findDashAudioTrack(tracks, track);

        // Set is as the current track
        shaka.selectAudioLanguage(dashAudioTrack.language, dashAudioTrack.role);

        // Stop looping
        continue;
      }
    }
  };

  videojsAudioTracks.addEventListener('change', audioTracksChangeHandler);
  /* player.dash.mediaPlayer.on(dashjs.MediaPlayer.events.STREAM_TEARDOWN_COMPLETE, () => {
    videojsAudioTracks.removeEventListener('change', audioTracksChangeHandler);
  }); */
}

/*
 * Call `handlePlaybackMetadataLoaded` when `mediaPlayer` emits
 * `dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED`.
 */
export default function setupAudioTracks(player, shaka) {
  handleAudioTracksAdded(player, shaka, shaka.getAudioLanguagesAndRoles());
}
