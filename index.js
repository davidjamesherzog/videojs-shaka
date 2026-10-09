/* global videojs, document */
const player = videojs('videojs-shaka-player', {
  autoplay: true,
  // shaka tech will handle HLS and DASH
  techOrder: ['shaka', 'html5'],
  width: 800,
  height: 450,
  shaka: {
    debug: false,
    sideload: false,
    configuration: {
      // just an example of setting shaka player config options
      streaming: {
        bufferBehind: 40,
        bufferingGoal: 20
      }
    }
  }
});

player.qualityPickerPlugin();
player.src([{
  type: 'application/dash+xml',
  src: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd'
  // src: 'https://storage.googleapis.com/shaka-demo-assets/sintel-mp4-wvtt/dash.mpd'
  // src: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8'
  // src: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/hls.m3u8'
}]);

const stream = document.getElementById('stream');
const play = document.getElementById('play');

play.addEventListener('click', function() {
  let type = 'application/dash+xml';

  if (stream.value.indexOf('m3u8') > -1) {
    type = 'application/x-mpegURL';
  } else if (stream.value.indexOf('mp4') > -1) {
    // this will resort back to the html5 tech
    type = 'video/mp4';
  }
  player.reset();
  player.qualityPickerPlugin();
  player.src([{
    type,
    src: stream.value
  }]);
});
