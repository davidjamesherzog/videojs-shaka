import videojs from 'video.js';
import Shaka from './shaka';
import qualityPickerPlugin from './quality-picker';

// the video.js typings describe `getTech` as returning an instance, not the class
const Tech = videojs.getTech('Tech') as unknown as {registerTech(name: string, tech: unknown): void};

// Register Shaka as a Tech;
Tech.registerTech('Shaka', Shaka);

// Register quality picker plugin
const registerPlugin = (videojs.registerPlugin || videojs.plugin) as (name: string, plugin: unknown) => void;

registerPlugin('qualityPickerPlugin', qualityPickerPlugin);

export default Shaka;
