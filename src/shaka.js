import videojs from 'video.js';
import setupQualityTracks from './setup-quality-tracks';
import setupTextTracks from './setup-text-tracks';
import setupAudioTracks from './setup-audio-tracks';
import {version as VERSION} from '../package.json';

const Html5 = videojs.getTech('Html5');

// Default options for the plugin.
const defaults = {};

/**
 * An advanced Video.js plugin. For more information on the API
 *
 * See: https://blog.videojs.com/feature-spotlight-advanced-plugins/
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
  constructor(player, options) {
    // the parent class will add player under this.player
    super(player);

    this.options = videojs.mergeOptions(defaults, options);

    this.player_.ready(() => {
      this.player_.addClass('vjs-shaka');
    });
  }

  createEl() {
    var me = this;

    this.el_ = Html5.prototype.createEl.apply(this, arguments);

    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();

    this.shaka_ = new shaka.Player(this.el_);

    this.shaka_.configure({
      abr: {
        enabled: true
      },
      drm: this.options_.drm || {}
    });

    this.shaka_.addEventListener('buffering', function(e) {
      if (e.buffering) me.trigger('waiting');
    });

    this.el_.tech = this;
    return this.el_;
  }

  setSrc(src) {

    var me = this;

    this.shaka_.load(src).then(function() {
      me.initShakaMenus();
    });
  }

  dispose() {

    this.shaka_.unload();
    this.shaka_.destroy();

    return Html5.prototype.dispose.apply(this);
  }

  initShakaMenus() {
    setupQualityTracks(this.player_, this.shaka_);
    setupTextTracks(this.player_, this.shaka_);
    setupAudioTracks(this.player_, this, this.shaka_);
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

  var dashTypeRE = /^application\/dash\+xml/i;

  if (dashTypeRE.test(source.type)) {
    return 'probably';
  }

  return '';
};

export default Shaka;
