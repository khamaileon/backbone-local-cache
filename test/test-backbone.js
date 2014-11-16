/*global $, _, Backbone, QUnit, expect, fauxServer, localStorage*/


(function () {
    "use strict";

    $.ajaxSetup({ async: false });

    function reset() {
      $.get('http://localhost:3001/reset');
    }

    function serverStatus(status) {
        $.ajax({
            url: 'http://localhost:3001/status',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({status: status})
        });
    }

    localStorage.clear();

    reset();

    var BookModel = Backbone.LocalCache.Model.mixin(Backbone.Model).extend({
        defaults: {
            title: 'Unknown title',
            author: 'Unknown author'
        },
        urlRoot: 'http://localhost:3000/book'
    });

    var BookCollection = Backbone.LocalCache.Collection.mixin(Backbone.Collection).extend({
        model: BookModel,
        url: 'http://localhost:3000/book'
    });

    QUnit.asyncTest('collection: local & remote fetch + save', function (assert) {
        expect(8);
        localStorage.clear();
        reset();

        var books = new BookCollection();

        // local
        books.fetch({
            remote: false,
            success: function (collection, resp) {
                assert.deepEqual(resp, []);
                assert.equal(books.length, 0);
            }
        });

        // remote + server down
        serverStatus('down');
        books.fetch({
            local: false,
            error: function () {
                assert.equal(books.length, 0);
            }
        });

        // remote + server up
        serverStatus('up');
        books.fetch({
            local: false,
            success: function (collection, resp) {
                assert.deepEqual(resp.length, 10);
                assert.equal(books.length, 10);
            }
        });

        books.fetch({
            remote: false,
            success: function (collection) {
                var storageKeys = collection.map(function (model) {
                    return model.getStorageKey();
                });
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(collection.url), storageKeys);
            }
        });

        var book = books.get({id: 2});
        assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
        book.destroy({
            remote: false,
            success: function (model) {
                assert.ok(!_.has(localStorage, model.getStorageKey()));
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local save & fetch', function (assert) {
        expect(4);
        localStorage.clear();
        reset();

        var book = new BookModel({
            title: 'Les Fleurs du mal',
            author: 'Baudelaire'
        });

        book.save(null, {
            remote: false,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.storageKey), book.toJSON());
            }
        });

        book.fetch({
            remote: false,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.storageKey), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: remote update + partial', function (assert) {
        expect(14);
        localStorage.clear();
        reset();

        var book = new BookModel();

        // remote fetch
        book.set({id: 4});
        book.fetch({
            local: false,
            success: function (model, resp) {
                assert.equal(resp.author, 'John Steinbeck');
                assert.equal(book.get('author'), 'John Steinbeck');
            },
        });

        assert.equal(book.get('author'), 'John Steinbeck');

        // update
        book.set({
            title: 'The Grapes of Wrath',
            year: 1929
        });

        book.save(null, {
            local: false,
            success: function (model, resp, options) {
                assert.ok(!_.has(options, 'storageKey'));
                assert.equal(resp.title, 'The Grapes of Wrath');
                assert.equal(resp.year, '1929');
                assert.equal(book.get('title'), 'The Grapes of Wrath');
                assert.equal(book.get('year'), '1929');
            }
        });

        // update bis
        book.save({
            year: 1939
        }, {
            local: false,
            success: function (model, resp) {
                assert.equal(resp.year, '1939');
                assert.equal(book.get('year'), '1939');
            }
        });

        book.set({ title: 'Of Mice and Men' });

        // partial update
        book.save({
            year: 1937
        }, {
            local: false,
            patch: true,
            success: function (model, resp) {
                assert.equal(resp.title, 'The Grapes of Wrath');
                assert.equal(resp.year, '1937');
                assert.equal(book.get('title'), 'The Grapes of Wrath');
                assert.equal(book.get('year'), '1937');
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local update + partial', function (assert) {
        expect(11);
        localStorage.clear();
        reset();

        var book = new BookModel();

        // remote fetch without cache
        book.set({id: 5});
        book.fetch({
            local: false,
            cache: false,
            success: function (model, resp) {
                assert.equal(resp.author, 'Ernest Hemingway');
                assert.equal(book.get('author'), 'Ernest Hemingway');
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.url()), null);
            }
        });

        // remote fetch + cache
        book.set({id: 5});
        book.fetch({
            local: false,
            success: function (model, resp) {
                assert.equal(resp.author, 'Ernest Hemingway');
                assert.equal(book.get('author'), 'Ernest Hemingway');
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
            }
        });

        // update
        book.set({
            title: 'The Grapes of Wrath',
            year: 1929
        });

        book.save(null, {
            remote: false,
            success: function (model, resp) {
                assert.equal(resp.title, 'The Grapes of Wrath');
                assert.equal(resp.year, '1929');
                assert.equal(book.get('title'), 'The Grapes of Wrath');
                assert.equal(book.get('year'), '1929');
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local + remote error', function (assert) {
        expect(3);
        localStorage.clear();
        reset();

        var book = new BookModel({
            title: 'Les Fleurs du mal',
            author: 'Baudelaire'
        });

        book.save(null, {
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
            }
        });

        var book2 = new BookModel({
            title: 'Les Fleurs du mal',
            author: 'Baudelaire'
        });

        book2.save(null, {
            error: function (model, resp) {
                assert.equal(resp.status, 400);
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: fetchOrSave', function (assert) {
        expect(4);
        localStorage.clear();
        reset();

        var book = new BookModel({id: 8});

        serverStatus('down');
        book.fetchOrSave(null, {
            local: false,
            error: function (model, resp) {
                var pendingOperations = book.getPendingOperations();
                assert.equal(_.size(pendingOperations), 1);
            }
        });

        serverStatus('up');
        book.fetchOrSave(null, {
            success: function (model, resp) {
                var storageKey = book.getStorageKey();
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(storageKey), book.toJSON());
                var pendingOperations = book.getPendingOperations();
                assert.equal(_.size(pendingOperations), 0);
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local & remote save', function (assert) {
        expect(4);
        localStorage.clear();
        reset();

        var book = new BookModel({
            title: 'Les Fleurs du mal',
            author: 'Baudelaire'
        });

        serverStatus('down');
        book.save(null, {
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
            }
        });

        serverStatus('up');
        book.save(null, {
            autoSync: false,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local & remote fetch', function (assert) {
        expect(3);
        localStorage.clear();
        reset();

        var book = new BookModel();
        book.set({id: 9});

        serverStatus('down');
        book.fetch({
            error: function () {
                assert.ok(true);
            }
        });

        serverStatus('up');
        book.fetch({
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: sync pending operations', function (assert) {
        expect(6);
        localStorage.clear();
        reset();

        var book = new BookModel({
            title: 'Les Paradis artificiels',
            author: 'Baudelaire'
        });

        serverStatus('down');
        book.save(null, {
            success: function (model, resp) {
                var storageKey = book.getStorageKey();
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(storageKey), book.toJSON());
                var pendingOperations = book.getPendingOperations();
                assert.equal(_.size(pendingOperations), 1);
            }
        });

        book.save(null, {
            success: function (model, resp) {
                var storageKey = book.getStorageKey();
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(storageKey), book.toJSON());
                var pendingOperations = book.getPendingOperations();
                assert.equal(_.size(pendingOperations), 1);
            }
        });

        serverStatus('up');
        book.save({'title': "L'Art romantique"}, {
            patch: true,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(Backbone.LocalCache.CacheStorage.get(book.getStorageKey()), book.toJSON());
                var pendingOperations = book.getPendingOperations();
                assert.equal(_.size(pendingOperations), 0);
            }
        });

        QUnit.start();
    });

}());
