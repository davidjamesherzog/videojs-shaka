import videojs from 'video.js';
import setupQualityTracks from './setup-quality-tracks';
import setupTextTracks from './setup-text-tracks';
import setupAudioTracks from './setup-audio-tracks';
import {version as VERSION} from '../package.json';

const Html5 = videojs.getTech('Html5');

// Default options for the plugin.
// const defaults = {};

/**
 * Shaka Media Controller - Wrapper for HTML5 Media API
 *
 * @mixes Html5~SourceHandlerAdditions
 * @extends Html5
 */
class Shaka extends Html5 {

  /**
   * Create a Shaka plugin instance.
   *
   * @param  {Player} player
   *         A Video.js Player instance.
   *
   * @param  {Object} [options]
   *         An optional options object.
   *
   *         While not a core part of the Video.js plugin architecture, a
   *         second argument of options is a convenient way to accept inputs
   *         from your plugin's caller.
   */
  /**
   * Create an instance of this Tech.
   *
   * @param {Object} [options]
   *        The key/value store of player options.
   *
   * @param {Component~ReadyCallback} ready
   *        Callback function to call when the `HTML5` Tech is ready.
   */
  constructor(options, ready) {
    super(options, ready);

    this.vjsPlayer = videojs(options.playerId);
    
    shaka.log.debug('Shaka.constructor | ' + JSON.stringify(this.vjsPlayer.options_, null, 2));

    this.player_.ready(() => {
      this.player_.addClass('vjs-shaka');
    });
  }

  createEl() {
    this.el_ = Html5.prototype.createEl.apply(this, arguments);

    // set debug log level
    if (shaka.log) {
      if (this.options_.debug) {
        shaka.log.setLevel(shaka.log.Level.DEBUG);
      } else {
        shaka.log.setLevel(shaka.log.Level.ERROR);
      }
    }

    this.shaka_ = new shaka.Player(this.el_);

    this.el_.tech = this;
    return this.el_;
  }

  setSrc(src) {
    const me = this;
    shaka.log.debug('Shaka.setSrc | ' + src + ' | ' + JSON.stringify(me.options_, null, 2));

    let drm;
    if (typeof this.options_.drm === 'function') {
      drm = this.options_.drm();
    } else {
      drm = this.options_.drm || {};
    }
    this.shaka_.configure({
      abr: {
        enabled: true
      },
      drm: drm
    });
    if (this.options_.licenseServerAuth) {
      this.shaka_.getNetworkingEngine().registerRequestFilter(this.options_.licenseServerAuth);
    }

    this.shaka_.addEventListener('buffering', function(event) {
      if (event.buffering) me.vjsPlayer.trigger('waiting');
    });

    this.shaka_.addEventListener('error', function(event) {
      me.retriggerError(event.detail);
    });

    this.shaka_.load(src).then(function() {
      me.initShakaMenus();
    }).catch(me.retriggerError.bind(this));
  }

  dispose() {
    if (this.shaka_) {
      this.shaka_.unload();
      this.shaka_.destroy();
    }
  }

  initShakaMenus() {
    setupQualityTracks(this, this.shaka_);
    setupTextTracks(this, this.shaka_);
    setupAudioTracks(this, this.shaka_);
  }

  retriggerError(event) {
    let code;

    // map the shaka player error to the appropriate video.js error
    if (event.message &&
      (event.message.indexOf('UNSUPPORTED') > -1 || event.message.indexOf('NOT_SUPPORTED') > -1)) {
      code = 4;
    } else {
      switch (event.category) {
      case 1:
        code = 2;
        break;
      case 2:
      case 3:
      case 4:
        code = 3;
        break;
      case 5:
        code = 1;
        break;
      case 6:
        code = 5;
        break;
      case 7:
      case 8:
      case 9:
        code = 0;
        break;
      }
    }

    this.vjsPlayer.error({
      code,
      message: `${event.code} - ${event.message}`
    });

    // only reset the shaka player in 10ms async, so that the rest of the
    // calling function finishes
    setTimeout(() => {
      this.dispose();
    }, 10);
  }

}

// Define default values for the plugin's `state` object here.
Shaka.defaultState = {};

// Include the version number.
Shaka.VERSION = VERSION;

Shaka.isSupported = function() {
  return shaka.Player.isBrowserSupported();
};

Shaka.supportsTypeNatively = function(type) {
    const video = document.createElement('video');
    const result = video.canPlayType(type) != '';
    shaka.log.debug('Shaka.supportsTypeNatively | ' + type + ' | ' + result);
    return result;
};

Shaka.manifestSourceHandler = {};

Shaka.manifestSourceHandler.canHandleSource = function(source, options = {}) {
    const localOptions = videojs.mergeOptions(videojs.options, options);
    var type = '';
    if (!source.src || /^blob\:/i.test(source.src)) {
        /* do nothing */
    } else if (source.type) {
        type = source.type;
    } else {
        if (/\.mpd$/i.test(source.src)) {
            type = 'application/dash+xml'
        } else if (/\.m3u8$/i.test(source.src)) {
            type = 'application/vnd.apple.mpegurl'
        }
    }
    const result = Shaka.manifestSourceHandler.canPlayType(type, localOptions);
    shaka.log.debug('Shaka.manifestSourceHandler.canHandleSource | "' + result + '" | ' + type + ' | ' + JSON.stringify(localOptions, null, 2));
    return result;
};

Shaka.manifestSourceHandler.canUseDashType = function(type, options = {}) {
    const localOptions = videojs.mergeOptions(videojs.options, options);
    const enableDash = (localOptions.shaka.enableDash == null) ? !videojs.browser.IS_ANY_SAFARI : localOptions.shaka.enableDash;
    const pattern = /^application\/dash\+xml/i;
    const result = enableDash && pattern.test(type);
    shaka.log.debug('Shaka.manifestSourceHandler.canUseDashType | ' + enableDash + ' | ' + result + ' | ' + type + ' | ' + JSON.stringify(localOptions, null, 2));
    return result;
}

Shaka.manifestSourceHandler.canUseHlsType = function(type, options = {}) {
    const localOptions = videojs.mergeOptions(videojs.options, options);
    const enableHls = localOptions.shaka.enableHls;
    
    // HLS manifests can go by many mime-types
    const choices = [
        // Apple santioned
        'application/vnd.apple.mpegurl',
        // Apple sanctioned for backwards compatibility
        'audio/mpegurl',
        // Very common
        'audio/x-mpegurl',
        // Very common
        'application/x-mpegurl',
        // Included for completeness
        'video/x-mpegurl',
        'video/mpegurl',
        'application/mpegurl'
    ];
    const canPlayType = choices.some(function(choice) {
        return choice == type;
    });

    const result = enableHls && canPlayType;
    shaka.log.debug('Shaka.manifestSourceHandler.canUseHlsType | ' + enableHls + ' | ' + result + ' | ' + type + ' | ' + JSON.stringify(localOptions, null, 2));
    return result;
}

Shaka.manifestSourceHandler.canPlayType = function(type, options = {}) {
    const localOptions = videojs.mergeOptions(videojs.options, options);
    const overrideNative = localOptions.shaka.overrideNative;
    const canUseDash = Shaka.manifestSourceHandler.canUseDashType(type, localOptions);
    const canUseHls = Shaka.manifestSourceHandler.canUseHlsType(type, localOptions);
    const canUse = (canUseDash || canUseHls) && Shaka.isSupported() && (!Shaka.supportsTypeNatively(type) || overrideNative);
    const result = canUse ? 'maybe' : '';
    shaka.log.debug('Shaka.manifestSourceHandler.canPlayType | "' + result + '" | ' + type + ' | ' + JSON.stringify(localOptions, null, 2));
    return result;
};

Shaka.manifestSourceHandler.handleSource = function(source, tech, options) {
  shaka.log.debug('Shaka.manifestSourceHandler.handleSource: ' + source.src);
  tech.setSrc(source.src);
};

// Reset source handlers
Shaka.sourceHandlers = [];

// Register manifest source handler
Shaka.registerSourceHandler(Shaka.manifestSourceHandler, 0);

export default Shaka;
