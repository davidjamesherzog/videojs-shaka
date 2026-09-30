import document from 'global/document';
import window from 'global/window';

import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';

import plugin from '../src/plugin';
import {dedupeAudioTracks} from '../src/setup-audio-tracks';
import VideojsTextDisplayer, {cueToText} from '../src/videojs-text-displayer';
import {isMeaningfulLabel, languageDisplayName, textTrackLabel, audioTrackLabel} from '../src/track-label';

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
      assert.strictEqual(
        this.player.tech_.shaka_.getConfiguration().textDisplayFactory,
        this.player.tech_.textDisplayFactory_,
        'shaka renders text through the tech\'s text displayer'
      );
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

QUnit.module('videojs-shaka track helpers');

QUnit.test('dedupeAudioTracks collapses codec variants of the same language', function(assert) {
  const tracks = [
    {language: 'es', roles: [], label: null, codecs: 'mp4a.40.2', channelsCount: 2, active: false},
    {language: 'en', roles: ['main'], label: null, codecs: 'mp4a.40.2', channelsCount: 2, active: false},
    {language: 'es', roles: [], label: null, codecs: 'opus', channelsCount: 2, active: true},
    {language: 'en', roles: ['main'], label: null, codecs: 'opus', channelsCount: 2, active: false},
    {language: 'en', roles: ['description'], label: null, codecs: 'opus', channelsCount: 2, active: false},
    {language: 'en', roles: [], label: 'stream_6', codecs: 'mp4a.40.2', channelsCount: 6, active: false},
    {language: 'en', roles: [], label: 'stream_7', codecs: 'mp4a.40.2', channelsCount: 2, active: false}
  ];
  const deduped = dedupeAudioTracks(tracks, 'en');

  assert.strictEqual(deduped.length, 4, 'one entry per language/roles/channel layout');
  assert.strictEqual(deduped[0].codecs, 'opus', 'the active stream wins for a language');
  assert.deepEqual(
    deduped.map((t) => audioTrackLabel(t, 'en')),
    ['Spanish', 'English', 'English (description)', 'English (5.1)'],
    'roles and surround layouts stay distinct, generic labels are ignored'
  );
});

QUnit.test('track labels are readable', function(assert) {
  assert.notOk(isMeaningfulLabel('stream_0', 'en'), 'auto-generated packager names are not meaningful');
  assert.notOk(isMeaningfulLabel('audio-2', 'en'), 'auto-generated packager names are not meaningful');
  assert.notOk(isMeaningfulLabel('subtitles', 'en'), 'bare kind names are not meaningful');
  assert.notOk(isMeaningfulLabel('EN', 'en'), 'a repeat of the language code is not meaningful');
  assert.notOk(isMeaningfulLabel(null, 'en'), 'missing labels are not meaningful');
  assert.ok(isMeaningfulLabel('Director commentary', 'en'), 'real names are meaningful');

  assert.strictEqual(languageDisplayName('pt-BR', 'en'), 'Brazilian Portuguese', 'language codes are translated');
  assert.strictEqual(languageDisplayName('zz-not-a-language', 'en'), 'zz-not-a-language', 'unknown codes fall back to the code');

  assert.strictEqual(textTrackLabel({label: 'stream_1', language: 'el', forced: false}, 'en'), 'Greek', 'generic text labels are replaced');
  assert.strictEqual(textTrackLabel({label: 'English CC', language: 'en', forced: false}, 'en'), 'English CC', 'meaningful text labels are kept');
  assert.strictEqual(textTrackLabel({label: null, language: 'fr', forced: true}, 'en'), 'French (forced)', 'forced tracks are marked');
  assert.strictEqual(audioTrackLabel({label: null, language: 'en', roles: ['main'], channelsCount: 2}, 'en'), 'English', 'main role and stereo add nothing');
  assert.strictEqual(audioTrackLabel({label: 'stream_6', language: 'en', roles: [], channelsCount: 6}, 'en'), 'English (5.1)', 'surround layout is shown');
  assert.strictEqual(audioTrackLabel({label: null, language: 'de', roles: ['commentary'], channelsCount: 8}, 'en'), 'German (commentary, 7.1)', 'roles and layout combine');
});

QUnit.test('cueToText flattens nested cues and line breaks', function(assert) {
  assert.strictEqual(cueToText({payload: 'plain'}), 'plain', 'plain payload');
  assert.strictEqual(cueToText({
    payload: '',
    nestedCues: [
      {payload: 'first', nestedCues: []},
      {lineBreak: true},
      {payload: '', nestedCues: [{payload: 'sec', nestedCues: []}, {payload: 'ond', nestedCues: []}]}
    ]
  }), 'first\nsecond', 'nested cues joined with newlines');
});

QUnit.module('videojs-shaka text displayer', {

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

QUnit.test('feeds cues to the mirrored video.js track', function(assert) {
  const tech = this.player.tech_;
  const textTrack = tech.addRemoteTextTrack({kind: 'subtitles', language: 'en', label: 'en'}, false).track;

  textTrack.mode = 'showing';
  sinon.stub(tech.shaka_, 'getTextTracks').returns([{id: 7, language: 'en', active: true}]);
  tech.shakaTextTracks_ = [{shakaTrack: {id: 7, language: 'en'}, textTrack}];

  const displayer = new VideojsTextDisplayer(tech);

  assert.ok(displayer.isTextVisible(), 'text is visible while a mirrored track is showing');
  textTrack.mode = 'hidden';
  assert.notOk(displayer.isTextVisible(), 'text is not visible when no mirrored track is showing');
  textTrack.mode = 'showing';

  displayer.append([
    {startTime: 1, endTime: 2, payload: 'hello'},
    {startTime: 1, endTime: 2, payload: 'hello'},
    {startTime: 3, endTime: 4, payload: '', nestedCues: [{payload: 'a'}, {lineBreak: true}, {payload: 'b'}]},
    {startTime: 5, endTime: 5, payload: 'zero length'}
  ]);

  assert.strictEqual(textTrack.cues.length, 2, 'duplicate and zero-length cues are skipped');
  assert.strictEqual(textTrack.cues[0].text, 'hello', 'plain cue text');
  assert.strictEqual(textTrack.cues[1].text, 'a\nb', 'nested cue text');

  displayer.remove(0, 2.5);
  assert.strictEqual(textTrack.cues.length, 1, 'cues overlapping the removed range are dropped');
  assert.strictEqual(textTrack.cues[0].startTime, 3, 'later cue survives');

  tech.shaka_.getTextTracks.returns([]);
  displayer.append([{startTime: 6, endTime: 7, payload: 'ignored'}]);
  assert.strictEqual(textTrack.cues.length, 1, 'no cues are added without an active shaka text track');

  return displayer.destroy().then(() => {
    assert.strictEqual(textTrack.cues.length, 0, 'destroy clears the cues');
  });
});
