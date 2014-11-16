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

    Backbone.LocalCache.Model = {

        /**
         * Mixin model with a parent model.
         *
         * @param {Backbone.Model}
         * @returns {Backbone.LocalCache.Model}
         */

        mixin: function (Model) {
            this._parent = Model;
            return Model.extend(Backbone.LocalCache.Model);
        },

        /**
         * Return storage key.
         *
         * @returns {string}
         */

        getStorageKey: function () {
            if (!this.isNew()) return this.url();
            this.storageKey = this.storageKey || generateUUID();
            return this.storageKey;
        },

        /**
         * Update storage key.
         *
         * @returns {string}
         */

        updateStorageKey: function () {
            var self = this;
            if (!self.isNew() && self.storageKey) {
                Backbone.LocalCache.CacheStorage.set(self.url(), self.toJSON());
                Backbone.LocalCache.CacheStorage.del(this.storageKey);
                this.storageKey = this.url();
            }
        },

        /**
         * Override basic fetch method.
         *
         * @param {object} [options]
         * @returns {xhr}
         */

        fetch: function (options) {
            var self = this;

            // Defauts options.
            options = _.extend({
                local: true,
                remote: true,
                cache: true,
                autoSync: true
            }, options || {});

            // Backup original success method.
            var fetchSuccess = options.success;

            // Redefine success to add cache.
            options.success = function (model, resp, options) {
                // Cache data.
                if (options.cache)
                    Backbone.LocalCache.CacheStorage.set(self.getStorageKey(), self.toJSON());

                // Call the original success method.
                if (fetchSuccess)
                    fetchSuccess(model, resp, options);
            };

            // Call parent fetch method.
            return self._parent.prototype.fetch.call(self, options);
        },

        /**
         * Override basic save method.
         *
         * @param {string} [key]
         * @param {string} [val]
         * @param {object} [options]
         *
         * @returns {xhr}
         */

        save: function (key, val, options) {
            var self = this;
            var attrs = self.attributes;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (key == null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            // Defaults options.
            options = _.extend({
                local: true,
                remote: true,
                cache: true,
                autoSync: true
            }, options || {});

            // Backup original success method.
            var saveSuccess = options.success;

            // Redefine success to add cache.
            options.success = function (model, resp, options) {
                // Cache data.
                if (options.cache)
                    Backbone.LocalCache.CacheStorage.set(self.getStorageKey(), self.toJSON());

                // Call the original success method.
                if (saveSuccess)
                    saveSuccess(model, resp, options);

                self.updateStorageKey();
            };

            // Call parent save method.
            return self._parent.prototype.save.call(self, attrs, options);
        },

        /**
         * Fetch a model or save it if the fetch operation fails.
         *
         * @param {string} [key]
         * @param {string} [val]
         * @param {object} [options]
         *
         * @returns {xhr}
         */

        fetchOrSave: function (key, val, options) {
            var self = this;
            var attrs = self.attributes;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (key == null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            // Defaults options.
            options = _.extend({
                local: true,
                remote: true,
                autoSync: true
            }, options);

            // Backup original methods.
            var fetchOrSaveSuccess = options.success;
            var fetchOrSaveError = options.error;

            // Redefine error to call save method.
            options.error = function () {
                options.success = fetchOrSaveSuccess;
                options.error = fetchOrSaveError;
                self.save(attrs, options);
            };

            return self.fetch(options);
        },

        /**
         * Override basic destroy method.
         *
         * @param {object} [options]
         * @returns {xhr}
         */

        destroy: function (options) {
            var self = this;

            // Defaults options.
            options = _.extend({
                local: true,
                remote: true,
                autoSync: true
            }, options);

            // Call parent destroy method.
            return self._parent.prototype.destroy.call(self, options);
        },

        /**
         * Returns true if there is pending operations.
         *
         * @returns {boolean}
         */

        hasPendingOperations: function () {
            var operations = this.getPendingOperations();
            return !!operations.length;
        },

        /**
         * Return pending operations for this model.
         *
         * @returns {object[]}
         */

        getPendingOperations: function () {
            return Backbone.LocalCache.CacheStorage.get(
                'pendingOperations:' + this.getStorageKey()
            ) || [];
        },

        /**
         * Add a new pending operation.
         *
         * @param {object} operation
         */

        addPendingOperation: function (operation) {
            var operations = this.getPendingOperations();
            operations.push(operation);

            return Backbone.LocalCache.CacheStorage.set(
                'pendingOperations:' + this.getStorageKey(),
                operations
            );
        },

        /**
         * Remove pending operations.
         */

        delPendingOperations: function () {
            return Backbone.LocalCache.CacheStorage.del(
                'pendingOperations:' + this.getStorageKey()
            );
        },

        /**
         * Run pending operations not executed because of offline.
         *
         * @returns {Deferred}
         */

        executePendingOperations: function () {
            var self = this;
            var pendingOperations = self.getPendingOperations();

            // If there is no pending operations, stop here.
            if (!pendingOperations.length) return ;

            var deferreds = [];
            _(pendingOperations).each(function (operation) {
                var deferred = new $.Deferred();
                deferreds.push(deferred);

                var options = _.extend({}, operation.options);

                options.success = function () {
                    pendingOperations = _.without(pendingOperations, operation);
                    deferred.resolve(operation);
                };

                options.error = function (resp) {
                    if (!resp.status) return deferred.reject();

                    pendingOperations = _.without(pendingOperations, operation);
                    deferred.resolve(operation);
                };

                self._parent.prototype.sync.call(self, operation.method,
                    self.clone().clear().set(operation.data), options);
            });

            return $.when.apply($, deferreds)
                .done(function () {
                    if (_.isEmpty(pendingOperations))
                        self.delPendingOperations();
                });
        },

        /**
         * Override basic sync method.
         *
         * @param {string} method
         * @param {Backbone.Model} model
         * @param {object} options
         * @returns {xhr}
         */

        sync: function (method, model, options) {
            var self = this;
            var data = options.attrs || model.toJSON(options);

            // Backup original methods.
            var syncSuccess = options.success || function () {};
            var syncError = options.error || function () {};

            if (options.autoSync && self.hasPendingOperations()) {
                return self.executePendingOperations()
                .fail(function () {
                    self.addPendingOperation({
                        method: method,
                        data: data,
                        options: options
                    });
                })
                .done(function () {
                    return self.sync(method, model, options);
                });
            }

            options.error = function (resp) {
                if (resp.status || method === 'read')
                    return syncError(resp);

                self.addPendingOperation({
                    method: method,
                    data: data,
                    options: options
                });

                if (options.local) {
                    syncSuccess(data);
                } else {
                    syncError(resp);
                }
            };

            switch (method) {
            case 'create':
                if (!options.remote) return syncSuccess(data);
                return self._parent.prototype.sync.call(self, method, model, options);

            case 'read':
                if (options.local) {
                    if (!self.id && !self.storageKey)
                        return syncError();  // TODO: id error

                    if (!options.remote) {
                        var cacheObj = Backbone.LocalCache.CacheStorage.get(self.getStorageKey());

                        if (cacheObj)
                            return syncSuccess(cacheObj);

                        return syncError();  // TODO: 404 error response
                    }
                }

                if (options.remote)
                    return self._parent.prototype.sync.call(self, method, model, options);

            case 'update':
                if (options.local && !options.remote)
                    return syncSuccess(data);

                if (options.remote)
                    return self._parent.prototype.sync.call(self, method, model, options);

            case 'patch':
                if (options.local && !options.remote)
                    return syncSuccess(data);

                if (options.remote)
                    return self._parent.prototype.sync.call(self, method, model, options);

            case 'delete':
                if (options.local) {
                    Backbone.LocalCache.CacheStorage.del(self.getStorageKey());

                    if (!options.remote) return syncSuccess(); // TODO 204
                }

                if (options.remote)
                    return self._parent.prototype.sync.call(self, method, model, options);
            }
        }
    };

    Backbone.LocalCache.Collection = {
        mixin: function (Collection) {
            this._parent = Collection;
            return Collection.extend(Backbone.LocalCache.Collection);
        },
        fetch: function (options) {
            var self = this;

            // Defaults options.
            options = _.extend({
                local: true,
                remote: true,
                cache: true
            }, options || {});


            // Backup original succes method.
            var fetchSuccess = options.success || function () {};


            options.success = function (collection, resp, options) {
                if (options.cache) {
                    collection.each(function (model) {
                        model.save(null, {remote: false});
                    });

                    var storageKeys = self.map(function (model) {
                        return model.getStorageKey();
                    });

                    Backbone.LocalCache.CacheStorage.set(self.url, storageKeys);
                }

                fetchSuccess(collection, resp, options);
            };

            return self._parent.prototype.fetch.call(self, options);
        },

        sync: function (method, collection, options) {
            var self = this;
            var syncSuccess = options.success || function () {};
            var syncParse = options.parse;

            switch (method) {
            case 'read':
                if (options.local) {
                    options.parse = false;
                    var storageKeys = Backbone.LocalCache.CacheStorage.get(self.url);
                    var models = _.map(storageKeys, function (storageKey) {
                        return Backbone.LocalCache.CacheStorage.get(storageKey);
                    });
                    syncSuccess(models);
                }

                if (options.remote) {
                    options.parse = syncParse;
                    return self._parent.prototype.sync.call(self, method, collection, options);
                }

                break;
            }
        }
    };

}));
