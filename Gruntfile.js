module.exports = function (grunt) {
  grunt.initConfig({
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        singleRun: true
      }
    },
    run: {
      server: {
        options: {
          wait: false
        },
        args: [
          'server.js'
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-run');

  grunt.registerTask('test', [
    'run:server',
    'karma',
    'stop:server'
  ]);
};
