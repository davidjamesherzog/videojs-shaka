import document from 'global/document';
import window from 'global/window';

import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';

import plugin from '../src/plugin';

const Player = videojs.getComponent('Player');
const DASH_SOURCE = {
  type: 'application/dash+xml',
  src: 'https://example.com/manifest.mpd'
};

QUnit.test('the environment is sane', function(assert) {
  assert.strictEqual(typeof Array.isArray, 'function', 'es5 exists');
  assert.strictEqual(typeof sinon, 'object', 'sinon exists');
  assert.strictEqual(typeof videojs, 'function', 'videojs exists');
  assert.strictEqual(typeof plugin, 'function', 'plugin is a function');
  assert.strictEqual(typeof window.shaka, 'object', 'shaka player is loaded');
});

QUnit.module('videojs-shaka', {

  beforeEach() {
    this.fixture = document.getElementById('qunit-fixture');
    this.video = document.createElement('video');
    this.fixture.appendChild(this.video);
    this.player = videojs(this.video, {techOrder: ['shaka', 'html5']});
  },

  afterEach() {
    this.player.dispose();
    sinon.restore();
  }
});

QUnit.test('registers itself with video.js', function(assert) {
  assert.strictEqual(videojs.getTech('Shaka'), plugin, 'the Shaka tech was registered');
  assert.strictEqual(plugin.VERSION, videojs.getTech('Shaka').VERSION, 'the tech exposes a version');
  assert.strictEqual(
    typeof Player.prototype.qualityPickerPlugin,
    'function',
    'the quality picker plugin was registered'
  );
});

QUnit.test('claims DASH and HLS sources', function(assert) {
  assert.strictEqual(plugin.canPlaySource({type: 'application/dash+xml'}), 'probably', 'dash');
  assert.strictEqual(plugin.canPlaySource({type: 'application/x-mpegURL'}), 'probably', 'hls');
  assert.strictEqual(plugin.canPlaySource({type: 'application/vnd.apple.mpegurl'}), 'probably', 'apple hls');
  assert.strictEqual(plugin.canPlaySource({type: 'video/mp4'}), '', 'mp4 is left to other techs');
  assert.ok(plugin.isSupported(), 'the tech is supported in the test browser');
});

QUnit.test('loads DASH sources through shaka player', function(assert) {
  const done = assert.async();
  const load = sinon.stub(window.shaka.Player.prototype, 'load').resolves();

  this.player.one('loadedqualitydata', () => {
    assert.ok(true, 'quality data is published once the manifest loads');
  });

  this.player.src(DASH_SOURCE);

  this.player.ready(() => {
    assert.strictEqual(this.player.techName_, 'Shaka', 'the Shaka tech was selected');
    assert.ok(this.player.tech_.shaka_ instanceof window.shaka.Player, 'a shaka player was created');
    assert.ok(this.player.hasClass('vjs-shaka'), 'the tech adds a class to the player');

    this.player.tech_.one('loadedqualitydata', (event, {qualityData}) => {
      assert.ok(load.calledOnce, 'shaka player load was called once');
      assert.deepEqual(
        load.firstCall.args,
        [DASH_SOURCE.src, null, DASH_SOURCE.type],
        'the manifest url and mime type were handed to shaka player'
      );
      assert.deepEqual(qualityData.video, [], 'no qualities are listed for an empty manifest');
      done();
    });
  });
});

QUnit.test('surfaces critical shaka errors on the player', function(assert) {
  const done = assert.async();
  const shakaError = new window.shaka.util.Error(
    window.shaka.util.Error.Severity.CRITICAL,
    window.shaka.util.Error.Category.NETWORK,
    window.shaka.util.Error.Code.BAD_HTTP_STATUS
  );

  sinon.stub(window.shaka.Player.prototype, 'load').rejects(shakaError);

  this.player.one('error', () => {
    const error = this.player.error();

    assert.strictEqual(error.code, 2, 'network errors map to MEDIA_ERR_NETWORK');
    assert.ok(error.message.indexOf(String(shakaError.code)) === 0, 'the message carries the shaka error code');
    done();
  });

  this.player.src(DASH_SOURCE);
});

QUnit.test('ignores recoverable shaka errors', function(assert) {
  const done = assert.async();
  const shakaError = new window.shaka.util.Error(
    window.shaka.util.Error.Severity.RECOVERABLE,
    window.shaka.util.Error.Category.NETWORK,
    window.shaka.util.Error.Code.BAD_HTTP_STATUS
  );

  sinon.stub(window.shaka.Player.prototype, 'load').rejects(shakaError);
  sinon.stub(videojs.log, 'warn');

  this.player.src(DASH_SOURCE);

  this.player.ready(() => {
    // the load rejection is handled asynchronously
    this.player.tech_.shakaReady_.then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => {
      assert.strictEqual(this.player.error(), null, 'no error was set on the player');
      assert.ok(videojs.log.warn.called, 'the recoverable error was logged');
      done();
    });
  });
});
