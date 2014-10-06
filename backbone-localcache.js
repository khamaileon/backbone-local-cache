(function () {

    "use strict";

    // https://stackoverflow.com/questions/2010892/storing-objects-in-html5-localstorage
    Storage.prototype.setObject = function (key, value) {
        this.setItem(key, JSON.stringify(value));
    };

    Storage.prototype.getObject = function (key) {
        var value = this.getItem(key);
        return value && JSON.parse(value);
    };

    localStorage.dirtyModels = localStorage.dirtyModels || JSON.stringify({});
    localStorage.dirtyCollections = localStorage.dirtyCollections || JSON.stringify({});

    Backbone.LocalCacheModelMixin = {

        fetch: function (options) {
            console.debug('fetch: ', options);
            var self = this;

            options = _.extend({
                local: true,
                remote: true,
                autoSync: true
            }, options);

            return Backbone.Model.prototype.fetch.call(self, options);
        },

        save: function (key, val, options) {
            console.debug('save: ', key, val, options);
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
                remote: true
            }, options);

            return Backbone.Model.prototype.save.call(self, attrs, options);
        },

        destroy: function (options) {
            console.debug('destroy: ', options);
            var self = this;

            options = _.extend({
                local: true,
                remote: true
            }, options);

            return Backbone.Model.prototype.destroy.call(self, options);
        },

        sync: function (method, model, options) {
            console.debug('model sync: ', method, model, options);
            var self = this,
                data = JSON.stringify(options.attrs || model.toJSON(options)),
                origSuccess = options.success,
                origError = options.error,
                dirtyModels = localStorage.getObject('dirtyModels'),
                lsKey;  // key of the model instance in the local storage

            if (self.isNew()) {
                if (!self.uuid) {
                    self.uuid = utils.createUuid();
                }
                lsKey = self.uuid;
            } else {
                lsKey = self.url();
            }

            options.success = function (resp) {
                // FIXME: the original success method must be call before the
                //        model instance is being set into the local storage
                if (origSuccess) {
                    origSuccess(resp);
                }

                if (options.local) {
                    localStorage.setObject(lsKey, self.toJSON());
                }

                if (lsKey === model.uuid) {
                    localStorage[self.url()] = localStorage[model.uuid];
                    localStorage.removeItem(model.uuid);
                }
            };

            options.error = function (resp) {
                dirtyModels[lsKey] = {
                    method: method,
                    data: data
                };
                localStorage.setObject('dirtyModels', dirtyModels);
                if (origError) {
                    origError(resp);
                }
            };

            switch (method) {
            case 'create':
                if (options.local) {
                    localStorage.setObject(lsKey, data);

                    if (!options.remote && origSuccess) {
                        origSuccess(data);
                    }
                }
                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'read':
                if (options.local) {
                    if (!self.id && !self.uuid) {
                        if (origError) {
                            origError();  // TODO: id error
                        }
                        break;
                    }

                    if (!options.remote) {
                        if (localStorage.getObject(lsKey) && origSuccess) {
                            origSuccess(localStorage.getObject(lsKey));
                        } else if (origError) {
                            origError();  // TODO: 404 error response
                        }
                    }
                }
                if (options.remote) {
                    if (!self.id) {
                        if (origError) {
                            origError();  // TODO: id error
                        }
                        break;
                    }

                    if (options.autoSync && dirtyModels[lsKey]) {
                        options.success = function () {
                            return Backbone.Model.prototype.sync.call(self, method, model, options);
                        };
                        options.error = function () {
                            origError(); // TODO: sync error
                        };
                        options.data = dirtyModels[lsKey].data;
                        return self.sync(dirtyModels[lsKey].method, model, options);
                    }
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'update':
                if (options.local) {
                    localStorage.setObject(lsKey, self.toJSON());                        

                    if (!options.remote && origSuccess) {
                        origSuccess(localStorage.getObject(lsKey));
                    }
                }
                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'patch':
                if (options.local) {
                    localStorage.setObject(lsKey, _.extend(localStorage[lsKey], self.attrs));

                    if (!options.remote && origSuccess) {
                        origSuccess(localStorage.getObject(lsKey));
                    }
                }
                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;

            case 'delete':
                if (options.local) {
                    localStorage.removeItem(lsKey);
                    if (!options.remote) {
                        origSuccess();  // TODO: 204 ?
                    }
                }
                if (options.remote) {
                    return Backbone.Model.prototype.sync.call(self, method, model, options);
                }
                break;
            }
        },

        getOrCreate: function (key, val, options) {
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

            var origSuccess = options.success;

            self.fetch({
                success: function (model, resp, options) {
                    if (origSuccess) {
                        origSuccess(model, resp, options);
                    }
                },
                error: function () {
                    self.save(attrs, options);
                }
            });
        }
    };

    Backbone.LocalCacheModelCollectionMixin = {

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
            console.debug('collection  sync: ', method, model, options);
            var self = this,
                origSuccess = options.success,
                origParse = options.parse,
                lsKey = self.url;  // key of the collection instance in the local storage

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

}());
