# videojs-shaka

shaka player

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Usage](#usage)
  - [`<script>` Tag](#script-tag)
  - [Browserify/CommonJS](#browserifycommonjs)
  - [RequireJS/AMD](#requirejsamd)
- [Special Thanks](#special-thanks)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
## Installation

```sh
npm install --save videojs-shaka
```

## Usage

To include videojs-shaka on your website or web application, use any of the following methods.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-shaka.min.js"></script>
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka', 'html5'],
    ...
  });

  player.qualityPickerPlugin();
</script>
```

If you want to enable the bitrate quality picker menu, you'll need to initialize it by calling the `qualityPickerPlugin` function.

```html
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka', 'html5'],
    ...
  });

  player.qualityPickerPlugin();
</script>
```


### Browserify/CommonJS

When using with Browserify, install videojs-shaka via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual plugin function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('videojs-shaka');

var player = videojs('my-video', {
    techOrder: ['shaka', 'html5'],
    ...
  });

player.qualityPickerPlugin();
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', 'videojs-shaka'], function(videojs) {
  var player = videojs('my-video', {
    techOrder: ['shaka', 'html5'],
    ...
  });

  player.qualityPickerPlugin();
});
```

## Special Thanks

This library wasn't possible without the following libraries that were used to create this.

videojs-shaka-player - [https://github.com/MetaCDN/videojs-shaka-player](https://github.com/MetaCDN/videojs-shaka-player) 
videojs-quality-picker - [https://github.com/streamroot/videojs-quality-picker/](https://github.com/streamroot/videojs-quality-picker/) 
videojs-shaka - [https://github.com/halibegic/videojs-shaka](https://github.com/halibegic/videojs-shaka) 
videojs-contrib-dash - [https://github.com/videojs/videojs-contrib-dash](https://github.com/videojs/videojs-contrib-dash) 

## License

MIT. Copyright (c) Dave Herzog &lt;davidjherzog@gmail.com&gt;


[videojs]: http://videojs.com/
