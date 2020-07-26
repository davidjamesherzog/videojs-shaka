## Unreleased (2020-07-26)
* Added vagrant to ease the process of running the local demo for interactive development
* Added compatibility with video.js v7.9.2
* Verified compatibility with shaka-player 3.0.1
* Added configuration options enableDash, enableHls, and overrideNative.
* Added source handler - this replaces the default video.js source handlers
* Deferred support check to shaka.Player.isBrowserSupported()
* Added additional HLS mimetypes likely to be encountered per video.js
* Added demos of new features

## 0.4.5 (2020-07-17)
* Show label for text track if available (#26)
* Bump lodash from 4.17.15 to 4.17.19 (#24)

## 0.4.4 (2020-06-01)
* Fix FakeEvent is not a constructor error (#23)

## 0.4.3 (2020-05-08)
* Check if event.message exists (#21)

## 0.4.2 (2020-04-30)
* `variantchanged` event not firing when bitrate changed by user (#18)
* Buffering event not triggering `waiting` event (#17)

## 0.4.1 (2020-03-06)
* Previously selected quality menu items not deselected on mobile (#13)

## 0.4.0 (2020-02-02)
* Add HLS support
* Add sample app

## 0.3.0 (2019-05-31)
* Retrigger shaka errors to video.js errors

## 0.2.2 (2019-04-16)
* Don't remove garbage dash-audio track (clients will have to do it)

## 0.2.1 (2019-03-21)
* Fix bandwidth typo
* Don't set audio track if it is not found

## 0.2.0 (2019-03-19)
* Add ability to set DRM server after video.js loads
* Add debug capabilities

## 0.1.3 (2019-03-18)
* Update browser in package.json and repository
* Update README

## 0.1.2 (2019-03-18)
* Fix messed up 0.1.1 failed release

## 0.1.1 (2019-03-18)
* Update README
* Update keywords
* Add `prepare` task to NPM script

## 0.1.0 (2019-03-15)
* Initial release
