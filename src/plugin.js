import videojs from 'video.js';
import Shaka from './shaka';
import qualityPickerPlugin from './quality-picker';

const Tech = videojs.getTech('Tech');

// Register Shaka as a Tech;
Tech.registerTech('Shaka', Shaka);

// Register Shaka source handler
videojs.getTech('Shaka').registerSourceHandler(Shaka.manifestSourceHandler, 0);

// Register quality picker plugin
const registerPlugin = videojs.registerPlugin || videojs.plugin;
registerPlugin('qualityPickerPlugin', qualityPickerPlugin);

export default Shaka;
