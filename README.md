# videojs-shaka

shaka player

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Usage](#usage)
  - [`<script>` Tag](#script-tag)
  - [Debug](#debug)
  - [DRM](#drm)
  - [`qualitytrackchange` Event](#qualitytrackchange-event)
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
<script src="//path/to/shaka-player.compiled.js"></script>
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-shaka.min.js"></script>
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka'],
    ...
  });
  player.src([{
    type: 'application/dash+xml',
    src: '//path/to/some.mpd'
  }]);
</script>
```

If you want to enable the bitrate quality picker menu, you'll need to initialize it by calling the `qualityPickerPlugin` function.

```html
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka'],
    ...
  });

  player.qualityPickerPlugin();
  player.src([{
    type: 'application/dash+xml',
    src: '//path/to/some.mpd'
  }]);
</script>
```

### Debug

Configure DEBUG logging level in the following manner by including the `shaka-player.compiled.debug.js` on your page (default will be set to ERROR):

```html
<script src="//path/to/shaka-player.compiled.debug.js"></script>
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-shaka.min.js"></script>
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka'],
    shaka: {
      debug: true
      configuration: {
        // shaka player configuration - https://shaka-player-demo.appspot.com/docs/api/tutorial-config.html
      }   
    }
    ...
  });

  player.qualityPickerPlugin();
  player.src([{
    type: 'application/dash+xml',
    src: '//path/to/some.mpd'
  }]);
</script>
```

### Sideloading Subtitles/Captions

There may be times when you have embedded subtitles in your stream, but you want to side load webvtt files into video.js yourself.  Just specify `sideload: true` and the embedded subtitles in the stream will be ignored  (default will be set to false).

```html
<script src="//path/to/shaka-player.compiled.debug.js"></script>
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-shaka.min.js"></script>
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka'],
    shaka: {
      debug: false,
      sideload: true,
      configuration: {
        // shaka player configuration - https://shaka-player-demo.appspot.com/docs/api/tutorial-config.html
      }   
    }
    ...
  });

  player.qualityPickerPlugin();
  player.src([{
    type: 'application/dash+xml',
    src: '//path/to/some.mpd'
  }]);
</script>
```

### DRM

Configure DRM in the following manner:

```html
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka'],
    shaka: {
      configuration: {
        drm: {
          servers: {
            'com.widevine.alpha': 'https://foo.bar/drm/widevine'
          }
        },    
      }
      licenseServerAuth: function(type, request) {
        // Only add headers to license requests:
        if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
          // This is the specific header name and value the server wants:
          request.headers['CWIP-Auth-Header'] = 'VGhpc0lzQVRlc3QK';
          // This is the specific parameter name and value the server wants:
          // Note that all network requests can have multiple URIs (for fallback),
          // and therefore this is an array. But there should only be one license
          // server URI in this tutorial.
          request.uris[0] += '?CWIP-Auth-Param=VGhpc0lzQVRlc3QK';
        }
      }
    }
    ...
  });

  player.qualityPickerPlugin();
  player.src([{
    type: 'application/dash+xml',
    src: '//path/to/some.mpd'
  }]);
</script>
```

If you need to set the DRM server after you initialize video.js prior to loading the source, you can specify a function for `shaka.configuration.drm` as follows:

```html
<script>
  var player = videojs('my-video', {
    techOrder: ['shaka'],
    shaka: {
      configuration: {
        drm: function() {
          // return the object here like
          return {
            servers: {
              'com.widevine.alpha': 'https://foo.bar/drm/widevine'
            }
          }
        }
      }
    }
    ...
  });

  player.qualityPickerPlugin();
  player.src([{
    type: 'application/dash+xml',
    src: '//path/to/some.mpd'
  }]);
</script>
```

### `qualitytrackchange` Event

If you would like to know when a user switches video quality, you can register an event listener for `qualitytrackchange`.  The quality track object will be returned to you.

```html
<script>
  player.on('qualitytrackchange', function(event, track) {
    // do something with the track that was selected
  });
</script>
```

## Sample App

To run the sample app, you just need to start the development server with the following command:

```bash
$ npm run sample
```

Then just open the app at [http://localhost:3000/](http://localhost:3000/) 

## Special Thanks

This library wasn't possible without leveraging the following libraries that were used to create this.

- videojs-shaka-player - [https://github.com/MetaCDN/videojs-shaka-player](https://github.com/MetaCDN/videojs-shaka-player) 
- videojs-quality-picker - [https://github.com/streamroot/videojs-quality-picker/](https://github.com/streamroot/videojs-quality-picker/) 
- videojs-shaka - [https://github.com/halibegic/videojs-shaka](https://github.com/halibegic/videojs-shaka) 
- videojs-contrib-dash - [https://github.com/videojs/videojs-contrib-dash](https://github.com/videojs/videojs-contrib-dash) 

## License

MIT. Copyright (c) Dave Herzog &lt;davidjherzog@gmail.com&gt;


[videojs]: http://videojs.com/
