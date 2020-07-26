import videojs from 'video.js';
import Shaka from './shaka';
import qualityPickerPlugin from './quality-picker';

const Tech = videojs.getTech('Tech');

// Install built-in polyfills to patch browser incompatibilities.
shaka.polyfill.installAll();

// Create default options
const defaults = {
    autoInitQualityPicker: false,
    debug: false,
    drm: {},
    enableDash: true,
    enableHls: true,
    overrideNative: !videojs.browser.IS_ANY_SAFARI
}
videojs.options.shaka = videojs.mergeOptions(defaults, videojs.options.shaka || {});

// Register Shaka as a Tech;
Tech.registerTech('Shaka', Shaka);

// Register quality picker plugin
const registerPlugin = videojs.registerPlugin || videojs.plugin;
registerPlugin('qualityPickerPlugin', qualityPickerPlugin);

export default Shaka;
