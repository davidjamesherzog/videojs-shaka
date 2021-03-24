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

    this.player_.ready(() => {
      this.player_.addClass('vjs-shaka');
    });
  }

  createEl() {
    this.el_ = Html5.prototype.createEl.apply(this, arguments);

    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();

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

    if (this.options_.licenseServerAuth) {
      this.shaka_.getNetworkingEngine().registerRequestFilter(this.options_.licenseServerAuth);
    }

    this.shaka_.addEventListener('buffering', function(event) {
      if (event.buffering) {
        me.vjsPlayer.trigger('waiting');
      } else {
        me.vjsPlayer.trigger('playing');
      }
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
  return !!window.MediaSource;
};

Shaka.canPlaySource = function(source, tech) {

  const dashTypeRE = /^(application\/dash\+xml|application\/x-mpegURL)/i;

  if (dashTypeRE.test(source.type)) {
    return 'probably';
  }

  return '';
};

export default Shaka;
