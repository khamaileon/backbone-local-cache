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

  // https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  function generateUUID() {
    var d = new Date().getTime();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c === 'x' ? r : (r&0x7|0x8)).toString(16);
    });
  }

  Backbone.LocalCache = {};

  Backbone.LocalCache.CacheStorage = {
    get: function (key) {
      var value = window.localStorage.getItem(key);
      return value && JSON.parse(value);
    },
    set: function (key, value) {
      return window.localStorage.setItem(key, JSON.stringify(value));
    },
    del: function (key) {
      return window.localStorage.removeItem(key);
    }
  };

  // Backbone.LocalCache.PendingOperations = {
  //   add: function () {
  //     var ops = this.get();
  //     ops.push({
  //       uuid: generateUUID(),
  //       args: _.toArray(arguments)
  //     });

  //     Backbone.LocalCache.CacheStorage.set('pendingOperations', ops);
  //   },
  //   get: function () {
  //     return Backbone.LocalCache.CacheStorage.get('pendingOperations') || [];
  //   },
  //   del: function (uuid) {
  //     var ops = this.get();
  //     ops = _.without(ops, _.findWhere(ops, {uuid: uuid}));
  //     Backbone.LocalCache.CacheStorage.set('pendingOperations', ops);
  //   },
  //   execute: function (op) {
  //     return Backbone.sync(op.args[0], new Backbone.Model(), op.args[2]);
  //   },
  //   executeAll: function () {
  //     var ops = this.get();
  //     var deferreds = _.map(ops, function (op) {
  //       return this.execute(op);
  //     }, this);

  //     return Backbone.$.when.apply(Backbone.$, deferreds);
  //   }
  // };

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
      if (method === 'create' || method === 'read')
        Backbone.LocalCache.CacheStorage.set(getUrl(), res);

      success.apply(this, arguments);
    }, function (res) {
      var deferred = new Backbone.$.Deferred();
      var data = Backbone.LocalCache.CacheStorage.get(getUrl());

      // if (['create', 'update', 'destroy'].indexOf(method) !== -1)
      //   Backbone.LocalCache.PendingOperations.add(method, null, _.extend({url: getUrl()}, options));

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
