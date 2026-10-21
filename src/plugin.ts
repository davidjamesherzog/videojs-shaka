import videojs from 'video.js'
import qualityPickerPlugin from './quality-picker'
import Shaka from './shaka'

// the video.js typings describe `getTech` as returning an instance, not the class
// Register Shaka as a Tech;
videojs.registerTech('Shaka', Shaka)

// Register quality picker plugin
const registerPlugin = videojs.registerPlugin || videojs.plugin

registerPlugin('qualityPickerPlugin', qualityPickerPlugin)

export default Shaka
