/*jslint node: true, stupid: true*/
/*jslint node: false*/
/*global $, define, Storage, localStorage, _*/

(function (root, factory) {

    "use strict";

    // Set up Backbone-LocalCache appropriately for the environment. Start with AMD.
    if (typeof define === 'function' && define.amd) {
        define(['exports', 'backbone', 'underscore'], factory);

    // Next for Node.js or CommonJS.
    } else if (typeof exports !== 'undefined') {
        factory(exports, require('backbone'), require('underscore'));

    // Finally, as a browser global.
    } else {
        factory(root, root.Backbone, root._);
    }

}(this, function (exports, Backbone, _) {

    "use strict";

    // https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    var generateUUID = function () {
        var d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x7|0x8)).toString(16);
        });
    };

    // https://stackoverflow.com/questions/2010892/storing-objects-in-html5-localstorage
    Storage.prototype.setObject = function (key, value) {
        this.setItem(key, JSON.stringify(value));
    };

    Storage.prototype.getObject = function (key) {
        var value = this.getItem(key);
        return value && JSON.parse(value);
    };

    Backbone.LocalCache = {};

    Backbone.LocalCache.ModelMixin = {
        fetch: function (options) {
            var self = this;

            options = _.extend({
                local: true,
                remote: true,
                cache: true,
                autoSync: true
            }, options);

            var fetchSuccess = options.success;

            options.success = function (model, resp, options) {
                if (options.cache) {
                    localStorage.setObject(self.getLocaleStorageKey(), self.toJSON());
                }

                if (fetchSuccess) {
                    fetchSuccess(model, resp, options);
                }
            };

            return Backbone.Model.prototype.fetch.call(self, options);
        },

        save: function (key, val, options) {
            var self = this,
                attrs = self.attributes;
 
            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (key == null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options = _.extend({
                local: true,
                remote: true,
                cache: true,
                autoSync: true
            }, options);

            var saveSuccess = options.success;

            options.success = function (model, resp, options) {
                if (options.cache) {
                    localStorage.setObject(self.getLocaleStorageKey(), self.toJSON());
                }

                if (self.getLocaleStorageKey() !== self.uuid) {
                    localStorage.removeItem(self.uuid);
                }

                if (saveSuccess) {
                    saveSuccess(model, resp, options);
                }
            };

            return Backbone.Model.prototype.save.call(self, attrs, options);
        },

        destroy: function (options) {
            var self = this;

            options = _.extend({
                local: true,
                remote: true,
                autoSync: true
            }, options);

            return Backbone.Model.prototype.destroy.call(self, options);
        },

        getLocaleStorageKey: function () {
            var self = this;
            if (self.isNew()) {
                if (!self.uuid) {
                    self.uuid = generateUUID();
                }
                return self.uuid;
            }
            return self.url();
        },

        sync: function (method, model, options) {
            var self = this,
                data = options.attrs || model.toJSON(options),
                syncSuccess = options.success,
                syncError = options.error,
                dirtyModels = localStorage.getObject('dirtyModels') || {},
                storageKey = self.getLocaleStorageKey();

            if (options.local && options.remote && options.autoSync) {
                var dirtyModel = dirtyModels[storageKey];
                if (dirtyModel) {
                    var deferreds = [];
                    _(dirtyModel).each(function (request, timestamp) {
                        var deferred = new $.Deferred();
                        deferreds.push(deferred);
                        options.autoSync = false;
                        options.success = function () {
                            deferred.resolve(timestamp);
                        };
                        options.error = function () {
                            deferred.reject(timestamp);
                        };
                        self.sync(request.method, model, options);
                    });

                    $.when.apply($, deferreds).done(function () {
                        _.each(arguments, function (timestamp) {
                            delete dirtyModel[timestamp];
                        });
                        if (_.isEmpty(dirtyModel)) {
                            delete dirtyModels[storageKey];
                        }
                        localStorage.setObject('dirtyModels', dirtyModels);
                        options.success = syncSuccess;
                        options.error = syncError;
                        return Backbone.Model.prototype.sync.call(self, method, model, options);
                    });
                    return;
                }
            }

            options.error = function (resp) {
                dirtyModels[storageKey] = dirtyModels[storageKey] || {};
                dirtyModels[storageKey][Date.now()] = {
                    method: method,
                    data: data
                };
                localStorage.setObject('dirtyModels', dirtyModels);

                if (options.local && syncSuccess) {
                    syncSuccess(data);
                } else if (syncError) {
                    syncError(resp);
                }
            };

            switch (method) {
            case 'create':
                if (options.local) {
                    localStorage.setObject(storageKey, data);

                    if (!options.remote && syncSuccess) {
                        syncSuccess(data);
                    }
                }

                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'read':
                options.error = function (resp) {
                    dirtyModels[storageKey] = dirtyModels[storageKey] || {};
                    dirtyModels[storageKey][Date.now()] = {
                        method: method,
                        data: data
                    };
                    localStorage.setObject('dirtyModels', dirtyModels);

                    if (syncError) {
                        syncError(resp);
                    }
                };

                if (options.local) {
                    if (!self.id && !self.uuid) {
                        if (syncError) {
                            syncError();  // TODO: id error
                        }
                        break;
                    }

                    if (!options.remote) {
                        if (localStorage.getObject(storageKey) && syncSuccess) {
                            syncSuccess(localStorage.getObject(storageKey));
                        } else if (syncError) {
                            syncError();  // TODO: 404 error response
                        }
                    }
                }
                if (options.remote) {
                    if (!self.id) {
                        if (syncError) {
                            syncError();  // TODO: id error
                        }
                        break;
                    }

                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'update':
                if (options.local) {
                    localStorage.setObject(storageKey, data);

                    if (!options.remote && syncSuccess) {
                        syncSuccess(data);
                    }
                }

                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'patch':
                if (options.local) {
                    localStorage.setObject(storageKey, _.extend(localStorage[storageKey], self.attrs));

                    if (!options.remote && syncSuccess) {
                        syncSuccess(localStorage.getObject(storageKey));
                    }
                }

                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'delete':
                if (options.local) {
                    localStorage.removeItem(storageKey);
                    if (!options.remote) {
                        syncSuccess();  // TODO: 204 ?
                    }
                }

                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;
            }
        },

        fetchOrSave: function (key, val, options) {
            var self = this,
                attrs = self.attributes;
 
            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (key == null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options = _.extend({
                local: true,
                remote: true,
                autoSync: true
            }, options);

            var fetchOrSaveError = options.error;

            options.error = function () {
                options.error = fetchOrSaveError;
                self.save(attrs, options);
            };

            return self.fetch(options);
        }
    };

    Backbone.LocalCache.CollectionMixin = {
        constructor: function (attributes, options) {
            Backbone.Collection.apply(this, arguments);

            this.on('add remove', function (eventName) {
                localStorage.setObject(this.url, this.toJSON());
            });
        },

        fetch: function (options) {
            var self = this;

            options = _.extend({
                local: true,
                remote: true
            }, options);

            return Backbone.Collection.prototype.fetch.call(self, options);
        },

        sync: function (method, model, options) {
            var self = this,
                origSuccess = options.success,
                origParse = options.parse,
                storageKey = self.url;  // key of the collection instance in the local storage

            switch (method) {
            case 'read':
                if (options.local) {
                    options.parse = false;
                    origSuccess(model.models);
                }
                if (options.remote) {
                    options.parse = origParse;
                    return Backbone.Collection.prototype.sync.call(self, method, model, options);
                }
                break;
            }
        }
    };

}));
