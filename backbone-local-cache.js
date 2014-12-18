(function (root, factory) { 'use strict';
  // AMD.
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'backbone', 'underscore'], factory);

  // CommonJS.
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('backbone'), require('underscore'));

  // Global.
  } else {
    factory(root, root.Backbone, root._);
  }

}(this, function (exports, Backbone, _) { 'use strict';

  function urlError() {
    throw new Error('A "url" property or function must be specified');
  }

  Backbone.LocalCache = {};

  Backbone.LocalCache.CacheStorage = {
    get: function (key) {
      var value = window.localStorage.getItem(key);
      return value && JSON.parse(value);
    },
    set: function (key, value) {
      return window.localStorage.setItem(key, JSON.stringify(value));
    }
  };

  // Backup original sync.
  var originalSync = Backbone.sync;

  /**
   * Overrided version of Backbone sync.
   */

  Backbone.sync = function (method, model, options) {
    options = options || {};

    function getUrl() {
      return options.url || _.result(model, 'url') || urlError();
    }

    var success = options.success || function () {};
    var error = options.error || function () {};

    options.success = function () {};
    options.error = function () {};

    // Fall back to original sync.
    return originalSync.apply(this, arguments)
    .then(function (res) {
      success.apply(this, arguments);

      if (method === 'create' || method === 'read')
        Backbone.LocalCache.CacheStorage.set(getUrl(), res);

      return res;
    }, function (res) {
      var deferred = new Backbone.$.Deferred();
      var data = Backbone.LocalCache.CacheStorage.get(getUrl());

      if (!res.status && data) {
        success(data);
        deferred.resolve(data);
      } else {
        error.apply(this, arguments);
        deferred.reject.apply(deferred, arguments);
      }

      return deferred.promise();
    });
  };
}));
