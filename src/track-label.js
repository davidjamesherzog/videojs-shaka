import window from 'global/window';

// labels that packagers generate automatically and that mean nothing to a viewer,
// e.g. `stream_0`, `audio-2`, `track 3`, `subtitles`
const GENERIC_LABEL_RE = /^(stream|track|audio|video|text|sub|subs|subtitle|subtitles|caption|captions|cc|und|undefined|unknown)?[\s_-]*\d*$/i;

/**
 * Whether a track label carries information worth showing, as opposed to an
 * auto-generated name or a plain repeat of the language code.
 *
 * @param {string|null|undefined} label
 *        The label reported by shaka player.
 *
 * @param {string} [language]
 *        The track's language code.
 *
 * @return {boolean}
 *         Whether the label should be shown to the viewer.
 */
export function isMeaningfulLabel(label, language) {
  if (typeof label !== 'string' || !label.trim()) {
    return false;
  }

  const trimmed = label.trim();

  if (GENERIC_LABEL_RE.test(trimmed)) {
    return false;
  }

  if (language && trimmed.toLowerCase() === String(language).toLowerCase()) {
    return false;
  }

  return true;
}

/**
 * Translate a language code into a name in the player's UI language, e.g.
 * `pt-BR` -> `Brazilian Portuguese`. Falls back to the code itself when the
 * browser cannot translate it.
 *
 * @param {string} language
 *        A BCP 47 language code.
 *
 * @param {string} [uiLanguage='en']
 *        The language to display the name in.
 *
 * @return {string}
 *         A display name, or the original code.
 */
export function languageDisplayName(language, uiLanguage = 'en') {
  if (!language) {
    return '';
  }

  if (window.Intl && typeof window.Intl.DisplayNames === 'function') {
    try {
      const displayNames = new window.Intl.DisplayNames([uiLanguage, 'en'], {type: 'language'});
      const name = displayNames.of(language);

      if (name && name.toLowerCase() !== String(language).toLowerCase()) {
        return name;
      }
    } catch (e) {
      // invalid language tag or unsupported locale: fall through to the code
    }
  }

  return language;
}

/**
 * Describe an audio channel layout, e.g. 6 channels -> `5.1`.
 *
 * @param {number|null|undefined} channelsCount
 *        The number of audio channels.
 *
 * @return {string}
 *         A short description, or an empty string for mono/stereo/unknown.
 */
export function channelLayout(channelsCount) {
  if (!channelsCount || channelsCount <= 2) {
    return '';
  }

  if (channelsCount === 6) {
    return '5.1';
  }

  if (channelsCount === 8) {
    return '7.1';
  }

  return `${channelsCount}ch`;
}

/**
 * Build the base name for a track from its label or its language.
 *
 * @param {Object} track
 *        A shaka text or audio track.
 *
 * @param {string} [uiLanguage]
 *        The player's UI language.
 *
 * @return {string}
 *         A readable name.
 *
 * @private
 */
function baseLabel(track, uiLanguage) {
  if (isMeaningfulLabel(track.label, track.language)) {
    return track.label.trim();
  }

  return languageDisplayName(track.language, uiLanguage) || track.label || '';
}

/**
 * Build a viewer facing label for a shaka text track.
 *
 * @param {shaka.extern.TextTrack} track
 *        The shaka text track.
 *
 * @param {string} [uiLanguage]
 *        The player's UI language.
 *
 * @return {string}
 *         A readable label such as `English` or `English (forced)`.
 */
export function textTrackLabel(track, uiLanguage) {
  const label = baseLabel(track, uiLanguage);

  if (track.forced && !/forced/i.test(label)) {
    return `${label} (forced)`;
  }

  return label;
}

/**
 * Build a viewer facing label for a shaka audio track, including any
 * non-default roles and a surround channel layout.
 *
 * @param {shaka.extern.AudioTrack} track
 *        The shaka audio track.
 *
 * @param {string} [uiLanguage]
 *        The player's UI language.
 *
 * @return {string}
 *         A readable label such as `English`, `English (description)` or
 *         `English (5.1)`.
 */
export function audioTrackLabel(track, uiLanguage) {
  const label = baseLabel(track, uiLanguage);
  const extras = (track.roles || []).filter((role) => role && role !== 'main');
  const layout = channelLayout(track.channelsCount);

  if (layout) {
    extras.push(layout);
  }

  if (!extras.length) {
    return label;
  }

  return `${label} (${extras.join(', ')})`;
}

/**
 * Get the UI language of the player a tech belongs to.
 *
 * @param {Tech} tech
 *        The video.js tech.
 *
 * @return {string}
 *         The player's language, defaulting to `en`.
 */
export function uiLanguageOf(tech) {
  const player = tech && typeof tech.getPlayer_ === 'function' ? tech.getPlayer_() : null;

  return (player && player.language && player.language()) || 'en';
}
