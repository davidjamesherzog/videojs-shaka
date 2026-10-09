import window from 'global/window';

/**
 * Flatten a shaka cue (which may be a tree of nested cues carrying styling)
 * into plain text, turning shaka line breaks into newlines.
 *
 * @param {shaka.text.Cue} cue
 *        The shaka cue.
 *
 * @return {string}
 *         The cue's text.
 */
export function cueToText(cue) {
  if (cue.lineBreak) {
    return '\n';
  }

  if (cue.nestedCues && cue.nestedCues.length) {
    return cue.nestedCues.map(cueToText).join('');
  }

  return cue.payload || '';
}

/**
 * Collect the cues of a video.js/native text track into a plain array.
 *
 * @param {TextTrack} track
 *        A video.js or native text track.
 *
 * @return {TextTrackCue[]}
 *         The cues, or an empty array when the track exposes none.
 */
function cuesOf(track) {
  const cues = track && track.cues;

  if (!cues) {
    return [];
  }

  const result = [];

  for (let i = 0; i < cues.length; i++) {
    result.push(cues[i]);
  }

  return result;
}

/**
 * A `shaka.extern.TextDisplayer` that hands shaka's cues to the video.js text
 * track that mirrors the selected shaka text track, instead of creating
 * native text tracks on the `<video>` element. That keeps a single list of
 * text tracks in video.js and lets video.js (or the browser, where video.js
 * uses native tracks) render the captions.
 *
 * @implements {shaka.extern.TextDisplayer}
 */
class VideojsTextDisplayer {

  /**
   * Create a displayer for a tech.
   *
   * @param {Tech} tech
   *        The `Shaka` tech. Its `shakaTextTracks_` array, maintained by
   *        `setupTextTracks`, maps shaka text tracks to video.js text tracks.
   */
  constructor(tech) {
    this.tech_ = tech;
    this.visible_ = false;
  }

  /**
   * Find the video.js text track that mirrors the shaka text track that is
   * currently selected.
   *
   * @return {TextTrack|null}
   *         The video.js text track, if any.
   *
   * @private
   */
  getActiveTrack_() {
    const tech = this.tech_;

    if (!tech || !tech.shaka_ || !tech.shakaTextTracks_) {
      return null;
    }

    const activeShakaTrack = tech.shaka_.getTextTracks().find((track) => track.active);

    if (!activeShakaTrack) {
      return null;
    }

    const match = tech.shakaTextTracks_.find(({shakaTrack}) => shakaTrack.id === activeShakaTrack.id) ||
      tech.shakaTextTracks_.find(({shakaTrack}) => shakaTrack.language === activeShakaTrack.language);

    return match ? match.textTrack : null;
  }

  /**
   * Apply shaka text configuration. Rendering is left to video.js, so there
   * is nothing to configure here.
   */
  configure() {}

  /**
   * Add cues to the active video.js text track.
   *
   * @param {shaka.text.Cue[]} cues
   *        The cues shaka player has buffered.
   */
  append(cues) {
    const track = this.getActiveTrack_();

    if (!track) {
      return;
    }

    // a native track only exposes its cues while it is not disabled
    if (track.mode === 'disabled') {
      track.mode = 'hidden';
    }

    const Cue = window.VTTCue || window.TextTrackCue;
    const existing = cuesOf(track);

    cues.forEach((cue) => {
      const text = cueToText(cue);

      if (!text.trim() || cue.endTime <= cue.startTime) {
        return;
      }

      const duplicate = existing.some((c) =>
        c.startTime === cue.startTime && c.endTime === cue.endTime && c.text === text);

      if (duplicate) {
        return;
      }

      const vttCue = new Cue(cue.startTime, cue.endTime, text);

      existing.push(vttCue);
      track.addCue(vttCue);
    });
  }

  /**
   * Remove all cues that overlap the given time range from every text track
   * this plugin created.
   *
   * @param {number} startTime
   *        Start of the range, in seconds.
   *
   * @param {number} endTime
   *        End of the range, in seconds.
   *
   * @return {boolean}
   *         Always `true`, as required by the interface.
   */
  remove(startTime, endTime) {
    const tech = this.tech_;

    if (!tech || !tech.shakaTextTracks_) {
      return true;
    }

    tech.shakaTextTracks_.forEach(({textTrack}) => {
      cuesOf(textTrack).forEach((cue) => {
        if (cue.startTime < endTime && cue.endTime > startTime) {
          textTrack.removeCue(cue);
        }
      });
    });

    return true;
  }

  /**
   * Whether text is visible. Visibility is controlled by the `mode` of the
   * video.js text tracks: a track is `showing` before this plugin asks shaka
   * to select it. Shaka only buffers a text stream when this returns `true`
   * at the moment the stream is selected, so it cannot rely on the visibility
   * shaka itself sets afterwards.
   *
   * @return {boolean}
   *         Whether one of the plugin's video.js text tracks is showing.
   */
  isTextVisible() {
    const tech = this.tech_;

    if (tech && tech.shakaTextTracks_ && tech.shakaTextTracks_.length) {
      return tech.shakaTextTracks_.some(({textTrack}) => textTrack.mode === 'showing');
    }

    return this.visible_;
  }

  /**
   * Record the visibility shaka requested.
   *
   * @param {boolean} on
   *        Whether text should be visible.
   */
  setTextVisibility(on) {
    this.visible_ = on;
  }

  /**
   * Required by the interface; the video.js track already carries the
   * language.
   */
  setTextLanguage() {}

  /**
   * Drop all cues and release the tech.
   *
   * @return {Promise}
   *         Resolves once destroyed.
   */
  destroy() {
    this.remove(0, Infinity);
    this.tech_ = null;

    return Promise.resolve();
  }
}

export default VideojsTextDisplayer;
