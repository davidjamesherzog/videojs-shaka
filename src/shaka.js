import videojs from 'video.js';
import window from 'global/window';
import setupQualityTracks from './setup-quality-tracks';
import setupTextTracks from './setup-text-tracks';
import setupAudioTracks from './setup-audio-tracks';
import {version as VERSION} from '../package.json';

const Html5 = videojs.getTech('Html5');

// mime types that shaka player can play
const SHAKA_TYPE_RE = /^(application\/dash\+xml|application\/x-mpegurl|application\/vnd\.apple\.mpegurl)$/i;

// shaka player error codes that should not surface as a video.js error
// 7000 - LOAD_INTERRUPTED: a newer `load()` call replaced the previous one
const IGNORED_SHAKA_ERROR_CODES = [7000];

/**
 * Shaka Media Controller - Wrapper for HTML5 Media API
 *
 * @mixes Html5~SourceHandlerAdditions
 * @extends Html5
 */
class Shaka extends Html5 {

  /**
   * Create an instance of this Tech.
   *
   * @param {Object} [options]
   *        The key/value store of player options.
   *
   * @param {Function} ready
   *        Callback function to call when the `Shaka` Tech is ready.
   */
  constructor(options, ready) {
    super(options, ready);

    this.ready(() => {
      const player = this.getPlayer_();

      if (player) {
        player.addClass('vjs-shaka');
      }
    });
  }

  /**
   * Get the video.js player this tech belongs to.
   *
   * @return {Player|undefined}
   *         The player, if it exists.
   *
   * @private
   */
  getPlayer_() {
    return videojs.getPlayer(this.options_.playerId);
  }

  /**
   * Create the `Shaka` Tech's DOM element and the shaka player attached to it.
   *
   * @return {Element}
   *         The element that gets created.
   */
  createEl() {
    const shaka = window.shaka;

    this.el_ = Html5.prototype.createEl.apply(this, arguments);

    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();

    // set debug log level (`shaka.log` only exists in the debug build)
    if (shaka.log) {
      if (this.options_.debug) {
        shaka.log.setLevel(shaka.log.Level.DEBUG);
      } else {
        shaka.log.setLevel(shaka.log.Level.ERROR);
      }
    }

    this.shaka_ = new shaka.Player();
    this.shakaReady_ = this.shaka_.attach(this.el_);

    this.shaka_.addEventListener('buffering', (event) => {
      const player = this.getPlayer_();

      if (!player) {
        return;
      }

      if (event.buffering) {
        player.trigger('waiting');
      } else {
        player.trigger('playing');
      }
    });

    this.shaka_.addEventListener('error', (event) => {
      this.retriggerError(event.detail);
    });

    this.el_.tech = this;
    return this.el_;
  }

  /**
   * Set the source for the tech. This bypasses the `Html5` source handlers
   * (including VHS) so that shaka player always handles the source.
   *
   * @param {Object} source
   *        The source object with `src` and `type`.
   */
  setSource(source) {
    this.currentSource_ = source;
    this.setSrc(source.src, source.type);
  }

  /**
   * Load a manifest into shaka player.
   *
   * @param {string} src
   *        The manifest url.
   *
   * @param {string} [type]
   *        The mime type of the manifest, e.g. `application/dash+xml`.
   */
  setSrc(src, type) {
    const shakaOptions = this.options_.configuration || {};

    if (typeof shakaOptions.drm === 'function') {
      shakaOptions.drm = shakaOptions.drm();
    } else {
      shakaOptions.drm = shakaOptions.drm || {};
    }
    if (!shakaOptions.abr) {
      shakaOptions.abr = {
        enabled: true
      };
    }
    this.shaka_.configure(shakaOptions);

    if (this.options_.licenseServerAuth && !this.requestFilterRegistered_) {
      this.shaka_.getNetworkingEngine().registerRequestFilter(this.options_.licenseServerAuth);
      this.requestFilterRegistered_ = true;
    }

    const mimeType = typeof type === 'string' ? type.toLowerCase() : null;

    this.shakaReady_
      .then(() => this.shaka_.load(src, null, mimeType))
      .then(() => this.initShakaMenus())
      .catch((error) => this.retriggerError(error));
  }

  /**
   * Dispose of the shaka player and the tech.
   */
  dispose() {
    const shakaPlayer = this.shaka_;

    this.shaka_ = null;

    if (shakaPlayer) {
      shakaPlayer.destroy();
    }

    super.dispose();
  }

  /**
   * Publish the quality, text and audio tracks from shaka player to video.js.
   */
  initShakaMenus() {
    if (!this.shaka_) {
      return;
    }

    // text and audio first so that `loadedqualitydata` listeners can see
    // every track that shaka player exposes
    setupTextTracks(this, this.shaka_);
    setupAudioTracks(this, this.shaka_);
    setupQualityTracks(this, this.shaka_);
  }

  /**
   * Map a shaka player error to a video.js error and set it on the player.
   * Recoverable shaka errors (e.g. a failed request that will be retried)
   * are logged and otherwise ignored.
   *
   * @param {shaka.util.Error} error
   *        The shaka player error.
   */
  retriggerError(error) {
    if (!error || IGNORED_SHAKA_ERROR_CODES.indexOf(error.code) > -1) {
      return;
    }

    const shaka = window.shaka;
    const severity = shaka && shaka.util && shaka.util.Error ? shaka.util.Error.Severity : {CRITICAL: 2};

    // shaka player will recover from this on its own
    if (error.severity !== undefined && error.severity !== severity.CRITICAL) {
      videojs.log.warn('videojs-shaka: recoverable shaka error', error);
      return;
    }

    let code;

    // map the shaka player error to the appropriate video.js error
    if (error.message &&
      (error.message.indexOf('UNSUPPORTED') > -1 || error.message.indexOf('NOT_SUPPORTED') > -1)) {
      code = 4;
    } else {
      switch (error.category) {
      case 1:
        // NETWORK
        code = 2;
        break;
      case 2:
      case 3:
      case 4:
        // TEXT, MEDIA, MANIFEST
        code = 3;
        break;
      case 5:
        // STREAMING
        code = 1;
        break;
      case 6:
        // DRM
        code = 5;
        break;
      default:
        // PLAYER, CAST, STORAGE, ADS, ...
        code = 0;
        break;
      }
    }

    const player = this.getPlayer_();

    if (player) {
      player.error({
        code,
        message: `${error.code} - ${error.message || ''}`.trim()
      });
    }

    // unload shaka player in 10ms async, so that the rest of the
    // calling function finishes
    window.setTimeout(() => {
      if (this.shaka_) {
        this.shaka_.unload();
      }
    }, 10);
  }

}

// Define default values for the plugin's `state` object here.
Shaka.defaultState = {};

// Include the version number.
Shaka.VERSION = VERSION;

/**
 * Check if the browser and the loaded shaka player support playback.
 *
 * @return {boolean}
 *         Whether or not the tech is supported.
 */
Shaka.isSupported = function() {
  return !!(window.shaka && window.shaka.Player && window.shaka.Player.isBrowserSupported());
};

/**
 * Check if the tech can play the given mime type.
 *
 * @param {string} type
 *        The mime type to check.
 *
 * @return {string}
 *         'probably' for DASH and HLS, otherwise an empty string.
 */
Shaka.canPlayType = function(type) {
  return SHAKA_TYPE_RE.test(type) ? 'probably' : '';
};

/**
 * Check if the tech can play the given source.
 *
 * @param {Object} source
 *        The source object with a `type`.
 *
 * @return {string}
 *         'probably' for DASH and HLS, otherwise an empty string.
 */
Shaka.canPlaySource = function(source) {
  return Shaka.canPlayType(source.type);
};

export default Shaka;
