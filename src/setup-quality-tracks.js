/**
 * Label a video height, e.g. `1080p (HD)`.
 *
 * @param {number} height
 *        The video height in pixels.
 *
 * @return {string}
 *         The label.
 */
function heightLabel(height) {
  let suffix = '';

  if (height >= 2160) {
    suffix = ' (4k)';
  } else if (height >= 1440) {
    suffix = ' (2k)';
  } else if (height >= 720) {
    suffix = ' (HD)';
  }

  return height + 'p' + suffix;
}

/**
 * Only real, playable variants with a video component.
 *
 * @param {shaka.extern.Track[]} variants
 *        Tracks from `shakaPlayer.getVariantTracks()`.
 *
 * @return {shaka.extern.Track[]}
 *         The video variants.
 */
function videoVariants(variants) {
  return variants.filter((t) => t.type === 'variant' && t.height);
}

/**
 * Build the list of selectable video qualities: one entry per distinct height,
 * regardless of how many audio tracks (languages, codecs) the manifest pairs
 * it with, plus an `auto` entry when there is a choice to make.
 *
 * @param {shaka.extern.Track[]} variants
 *        Tracks from `shakaPlayer.getVariantTracks()`.
 *
 * @return {Object[]}
 *         Quality entries sorted from highest to lowest. The `id` of an entry
 *         is its height, and `-1` for `auto`.
 */
export function buildQualityList(variants) {
  const byHeight = {};

  videoVariants(variants).forEach((variant) => {
    const current = byHeight[variant.height];

    if (!current || variant.bandwidth > current.bandwidth) {
      byHeight[variant.height] = variant;
    }
  });

  const qualities = Object.keys(byHeight)
    .map(Number)
    .sort((a, b) => b - a)
    .map((height) => ({
      id: height,
      height,
      bandwidth: byHeight[height].bandwidth,
      label: heightLabel(height),
      selected: false
    }));

  if (qualities.length > 1) {
    qualities.unshift({
      id: -1,
      label: 'auto',
      selected: true
    });
  }

  return qualities;
}

/**
 * Choose the variant to play for a requested height. Prefers a variant that
 * carries the audio track that is currently playing (so a quality change never
 * changes the language), then the current video codec, then the highest
 * bandwidth.
 *
 * @param {shaka.extern.Track[]} variants
 *        Tracks from `shakaPlayer.getVariantTracks()`.
 *
 * @param {number} height
 *        The requested video height.
 *
 * @return {shaka.extern.Track|undefined}
 *         The variant to select, if any variant has that height.
 */
export function pickVariantForHeight(variants, height) {
  const candidates = videoVariants(variants).filter((t) => t.height === height);

  if (!candidates.length) {
    return;
  }

  const active = variants.find((t) => t.active);
  const score = (t) => {
    let result = 0;

    if (hasSameAudio(t, active)) {
      result += 4;
    }
    if (active && t.videoCodec === active.videoCodec) {
      result += 2;
    }
    if (active && t.audioCodec === active.audioCodec) {
      result += 1;
    }

    return result;
  };

  return candidates.sort((a, b) => (score(b) - score(a)) || (b.bandwidth - a.bandwidth))[0];
}

/**
 * Whether a variant carries the same audio track as the active variant.
 *
 * @param {shaka.extern.Track} track
 *        The candidate variant.
 *
 * @param {shaka.extern.Track} [active]
 *        The variant currently playing.
 *
 * @return {boolean}
 *         `true` when there is no active variant or the audio matches.
 */
function hasSameAudio(track, active) {
  if (!active) {
    return true;
  }

  if (active.audioId !== null && active.audioId !== undefined) {
    return track.audioId === active.audioId;
  }

  const rolesOf = (t) => (t.audioRoles || t.roles || []).slice().sort().join(',');

  return track.language === active.language &&
    rolesOf(track) === rolesOf(active) &&
    track.channelsCount === active.channelsCount;
}

/**
 * Whether a variant is allowed by shaka's ABR restrictions.
 *
 * @param {shaka.extern.Track} track
 *        The candidate variant.
 *
 * @param {shaka.extern.Restrictions} [restrictions]
 *        `abr.restrictions` from the shaka configuration.
 *
 * @return {boolean}
 *         `true` when the variant is within the restrictions.
 */
function withinRestrictions(track, restrictions) {
  if (!restrictions) {
    return true;
  }

  const within = (value, min, max) =>
    value === null || value === undefined ||
    ((min === undefined || value >= min) && (max === undefined || value <= max));

  return within(track.height, restrictions.minHeight, restrictions.maxHeight) &&
    within(track.width, restrictions.minWidth, restrictions.maxWidth) &&
    within(track.bandwidth, restrictions.minBandwidth, restrictions.maxBandwidth) &&
    within(track.frameRate, restrictions.minFrameRate, restrictions.maxFrameRate) &&
    within(track.channelsCount, restrictions.minChannelsCount, restrictions.maxChannelsCount) &&
    within(track.height && track.width ? track.height * track.width : null, restrictions.minPixels, restrictions.maxPixels);
}

/**
 * Choose the variant shaka's ABR would pick for the current bandwidth
 * estimate: the highest bitrate that fits the estimate (scaled by shaka's
 * upgrade target) that keeps the current audio track and respects the ABR
 * restrictions, or the lowest bitrate when nothing fits.
 *
 * Shaka's ABR manager does not re-evaluate when it is re-enabled; it waits for
 * the next segment download and its switch interval. With a full buffer of
 * low quality segments that can take a long time, so the plugin makes the
 * first choice itself when the viewer goes back to `auto`.
 *
 * @param {shaka.extern.Track[]} variants
 *        Tracks from `shakaPlayer.getVariantTracks()`.
 *
 * @param {number} estimatedBandwidth
 *        Shaka's bandwidth estimate in bits per second.
 *
 * @param {shaka.extern.AbrConfiguration} [abrConfig]
 *        `abr` from the shaka configuration.
 *
 * @return {shaka.extern.Track|undefined}
 *         The variant to start with, or `undefined` when there is nothing to
 *         choose from or no usable estimate.
 */
export function pickVariantForBandwidth(variants, estimatedBandwidth, abrConfig = {}) {
  if (!estimatedBandwidth || !isFinite(estimatedBandwidth)) {
    return;
  }

  const active = variants.find((t) => t.active);
  let candidates = videoVariants(variants).filter((t) => withinRestrictions(t, abrConfig.restrictions));
  const sameAudio = candidates.filter((t) => hasSameAudio(t, active));

  if (sameAudio.length) {
    candidates = sameAudio;
  }

  if (!candidates.length) {
    return;
  }

  const upgradeTarget = abrConfig.bandwidthUpgradeTarget || 0.85;
  const fits = candidates
    .filter((t) => t.bandwidth <= estimatedBandwidth * upgradeTarget)
    .sort((a, b) => b.bandwidth - a.bandwidth);

  if (fits.length) {
    return fits[0];
  }

  return candidates.sort((a, b) => a.bandwidth - b.bandwidth)[0];
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
      video: buildQualityList(shakaPlayer.getVariantTracks())
    },
    qualitySwitchCallback(id, type) {
      const clearBuffer = true;

      // Is auto?
      if (id === -1) {
        // jump straight to the quality the bandwidth estimate allows while
        // ABR is still disabled (so shaka does not warn about the manual
        // switch), then hand control back to ABR
        const track = pickVariantForBandwidth(
          shakaPlayer.getVariantTracks(),
          shakaPlayer.getStats().estimatedBandwidth,
          shakaPlayer.getConfiguration().abr
        );

        if (track && !track.active) {
          shakaPlayer.selectVariantTrack(track, clearBuffer);
        }

        shakaPlayer.configure({abr: {enabled: true}});
        return;
      }

      // Update the adaptation.
      shakaPlayer.configure({abr: {enabled: false}});

      const track = pickVariantForHeight(shakaPlayer.getVariantTracks(), id);

      // shaka fires `variantchanged` itself for manual selections
      if (track) {
        shakaPlayer.selectVariantTrack(track, clearBuffer);
      }
    }
  });
}
