module.exports = function (config) {
  config.set({
    frameworks: ['qunit'],
    autoWatch: true,
    colors: true,
    reporters: ['dots'],
    browsers: [process.env.TRAVIS ? 'Firefox' : 'Chrome'],
    files: [
      'bower_components/jquery/dist/jquery.js',
      'bower_components/underscore/underscore.js',
      'bower_components/backbone/backbone.js',
      'bower_components/backbone-faux-server/backbone-faux-server.js',
      'bower_components/backbone-relational/backbone-relational.js',
      'bower_components/backbone-super/backbone-super/backbone-super.js',

      'backbone-local-cache.js',
      'test/*.js'
    ],
    logLevel: config.LOG_ERROR
  });
};
