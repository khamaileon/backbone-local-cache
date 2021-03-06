module.exports = function (config) {
  config.set({
    frameworks: ['mocha'],
    autoWatch: true,
    colors: true,
    reporters: ['dots'],
    browsers: [process.env.TRAVIS ? 'Firefox' : 'Chrome'],
    files: [
      'bower_components/jquery/dist/jquery.js',
      'bower_components/underscore/underscore.js',
      'bower_components/backbone/backbone.js',
      'node_modules/chai/chai.js',

      'backbone-local-cache.js',
      'test.js'
    ],
    logLevel: config.LOG_ERROR
  });
};
