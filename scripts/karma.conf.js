const generate = require('videojs-generate-karma-config');

module.exports = function(config) {

  // see https://github.com/videojs/videojs-generate-karma-config
  // for options
  const options = {
    files(defaultFiles) {
      // the tech relies on the `shaka` global, just like it does in the browser
      return ['node_modules/shaka-player/dist/shaka-player.compiled.js'].concat(defaultFiles);
    }
  };

  config = generate(config, options);

  // any other custom stuff not supported by options here!
};
