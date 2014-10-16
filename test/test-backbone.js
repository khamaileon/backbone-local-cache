/*global $, _, Backbone, QUnit, expect, fauxServer, localStorage*/

(function () {
    "use strict";

    $.ajaxSetup({ async: false });

    console.log('fauxServer version: ' + fauxServer.getVersion());
    localStorage.clear();

    var BookModel = Backbone.Model.extend({
        defaults: {
            title: 'Unknown title',
            author: 'Unknown author'
        },
        urlRoot: 'book'
    }).extend(Backbone.LocalCache.ModelMixin);

    var BookCollection = Backbone.Collection.extend({
        model: BookModel,
        url: 'book'
    }).extend(Backbone.LocalCache.CollectionMixin);

    QUnit.asyncTest('collection: local & remote fetch', function (assert) {
        expect(6);
        localStorage.clear();

        var books = new BookCollection();

        // local
        books.fetch({
            remote: false,
            success: function (model, resp, options) {
                assert.deepEqual(resp, []);
                assert.equal(books.length, 0);
            }
        });

        // remote + server down
        fauxServer.enable(false);
        books.fetch({
            local: false,
            error: function () {
                assert.equal(books.length, 0);
            }
        });

        // remote + server up
        fauxServer.enable(true);
        books.fetch({
            local: false,
            success: function (model, resp) {
                assert.deepEqual(resp.length, 10);
                assert.equal(books.length, 10);
            }
        });

        assert.equal(books.length, 10);

        QUnit.start();
    });

    QUnit.asyncTest('model: local save & fetch', function (assert) {
        expect(6);
        localStorage.clear();

        var book = new BookModel({
            title: 'Les Fleurs du mal',
            author: 'Baudelaire'
        });

        book.save(null, {
            remote: false,
            success: function (model, resp, options) {
                assert.ok(_.has(options, 'storageKey'));
                assert.deepEqual(resp, book.toJSON());
                assert.equal(options.storageKey, book.storageKey);
                assert.deepEqual(localStorage.getObject(book.storageKey), book.toJSON());
            }
        });

        book.fetch({
            remote: false,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.storageKey), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: remote update + partial', function (assert) {
        expect(14);
        localStorage.clear();

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
                console.dir(options);
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
        expect(13);
        localStorage.clear();

        var book = new BookModel();

        // remote fetch without cache
        book.set({id: 5});
        book.fetch({
            local: false,
            cache: false,
            success: function (model, resp) {
                assert.equal(resp.author, 'Ernest Hemingway');
                assert.equal(book.get('author'), 'Ernest Hemingway');
                assert.deepEqual(localStorage.getObject(book.url()), null);
            }
        });

        // remote fetch + cache
        book.set({id: 5});
        book.fetch({
            local: false,
            success: function (model, resp) {
                assert.equal(resp.author, 'Ernest Hemingway');
                assert.equal(book.get('author'), 'Ernest Hemingway');
                assert.deepEqual(localStorage.getObject(book.url()), book.toJSON());
            }
        });

        // update
        book.set({
            title: 'The Grapes of Wrath',
            year: 1929
        });

        book.save(null, {
            remote: false,
            success: function (model, resp, options) {
                assert.ok(_.has(options, 'storageKey'));
                assert.equal(options.storageKey, book.url());
                assert.equal(resp.title, 'The Grapes of Wrath');
                assert.equal(resp.year, '1929');
                assert.equal(book.get('title'), 'The Grapes of Wrath');
                assert.equal(book.get('year'), '1929');
                assert.deepEqual(localStorage.getObject(book.url()), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local & remote save', function (assert) {
        expect(6);
        localStorage.clear();

        var book = new BookModel({
            title: 'Les Fleurs du mal',
            author: 'Baudelaire'
        });

        fauxServer.enable(false);
        book.save(null, {
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.getLocaleStorageKey()), book.toJSON());
                assert.deepEqual(localStorage.getObject(book.storageKey), book.toJSON());
            }
        });

        fauxServer.enable(true);
        book.save(null, {
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.getLocaleStorageKey()), book.toJSON());
                assert.deepEqual(localStorage.getObject(book.storageKey), null);
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local & remote fetch', function (assert) {
        expect(3);
        localStorage.clear();

        var book = new BookModel();
        book.set({id: 9});

        fauxServer.enable(false);
        book.fetch({
            error: function () {
                assert.ok(true);
            }
        });

        fauxServer.enable(true);
        book.fetch({
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.getLocaleStorageKey()), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: fetchOrSave', function (assert) {
        expect(6);
        localStorage.clear();

        var book = new BookModel({
            title: 'Les Paradis artificiels',
            author: 'Baudelaire'
        });

        fauxServer.enable(false);
        book.fetchOrSave(null, {
            local: false,
            error: function (model, resp) {
                assert.ok(true);
            }
        });

        fauxServer.enable(true);
        book.fetchOrSave(null, {
            remote: false,
            autoSync: false,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.getLocaleStorageKey()), book.toJSON());
                assert.deepEqual(localStorage.getObject(book.storageKey), book.toJSON());
            }
        });

        book.fetchOrSave(null, {
            autoSync: false,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.getLocaleStorageKey()), book.toJSON());
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: sync dirty models', function (assert) {
        expect(6);
        localStorage.clear();

        var book = new BookModel({
            title: 'Les Paradis artificiels',
            author: 'Baudelaire'
        });

        fauxServer.enable(false);
        book.save(null, {
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.getLocaleStorageKey()), book.toJSON());
                var dirtyModels = localStorage.getObject('dirtyModels');
                assert.equal(_.size(dirtyModels), 1);
            }
        });

        fauxServer.enable(true);
        book.save({'title': "L'Art romantique"}, {
            patch: true,
            success: function (model, resp) {
                assert.deepEqual(resp, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.getLocaleStorageKey()), book.toJSON());
                var dirtyModels = localStorage.getObject('dirtyModels');
                assert.equal(_.size(dirtyModels), 0);
            }
        });

        QUnit.start();
    });

}());
