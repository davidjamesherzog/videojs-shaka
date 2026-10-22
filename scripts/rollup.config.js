const generate = require('videojs-generate-rollup-config')
const resolve = require('@rollup/plugin-node-resolve').default

const EXTENSIONS = ['.ts', '.js', '.json']

// see https://github.com/videojs/videojs-generate-rollup-config
// for options
const options = {
  input: 'src/plugin.ts',
  testInput: 'test/**/*.test.ts',
  babel(defaults) {
    // compile typescript with babel; type checking is done by `npm run typecheck`
    defaults.presets = defaults.presets.concat(require.resolve('@babel/preset-typescript'))
    defaults.extensions = EXTENSIONS
    defaults.exclude = ['**/*.json']
    return defaults
  },
  // typescript has to be compiled away before the plugins that parse plain javascript run
  plugins(defaults) {
    Object.keys(defaults).forEach((buildType) => {
      defaults[buildType] = ['babel'].concat(defaults[buildType].filter((name) => name !== 'babel'))
    })
    return defaults
  },
  primedPlugins(defaults) {
    return Object.assign(defaults, {
      resolve: resolve({
        extensions: EXTENSIONS,
        mainFields: ['browser', 'module', 'jsnext:main', 'main'],
        dedupe: (id) => ['global', '@babel/runtime', 'video.js'].some((ext) => id.startsWith(ext))
      }),
      jsonResolve: resolve({extensions: EXTENSIONS})
    })
  }
}
const config = generate(options)

// Add additonal builds/customization here!

// export the builds to rollup
export default Object.values(config.builds)
