var player = videojs('videojs-shaka-player', {
  autoplay: true,
  techOrder: ['shaka', 'html5'], // shaka tech will handle HLS and DASH
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
  src: 'https://bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd'
}]);

var stream = document.getElementById('stream');
var play = document.getElementById('play');

play.addEventListener('click', function() {
  var type = 'application/dash+xml';
  if (stream.value.indexOf('m3u8') > -1) {
    type = 'application/x-mpegURL';
  } else if (stream.value.indexOf('mp4') > -1) {
    // this will resort back to the html5 tech
    type = 'video/mp4';
  }
  player.reset();
  player.qualityPickerPlugin();
  player.src([{
    type: type,
    src: stream.value
  }]);
});
