/*global _, Backbone, QUnit, fauxServer */

(function () {
    "use strict";

    console.log('fauxServer version: ' + fauxServer.getVersion());

    localStorage.clear();

    var BookModel = Backbone.Model.extend({
        defaults: {
            title: 'Unknown title',
            author: 'Unknown author'
        }
    }).extend(Backbone.LocalCacheModelMixin);

    var BookCollection = Backbone.Collection.extend({
        model: BookModel,
        url: 'books'
    }).extend(Backbone.LocalCacheModelCollectionMixin);

    QUnit.asyncTest('collection: local & remote fetch', function (assert) {
        expect(5);

        var book = new BookModel({
            title: 'Book title',
            author: 'Book author'
        });
        var books = new BookCollection();

        // local
        books.fetch({
            remote: false,
            autoSync: false,
            success: function (model, response) {
                assert.deepEqual(response, []);
                assert.equal(books.length, 0);
            }
        });

        // remote + server down
        fauxServer.enable(false);
        books.fetch({
            local: false,
            autoSync: false,
            error: function (model, response, options) {
                assert.equal(books.length, 0);
            }
        });

        // remote + server up
        fauxServer.enable(true);
        books.fetch({
            local: false,
            autoSync: false,
            success: function (model, response) {
                assert.deepEqual(response.length, 10);
                assert.equal(books.length, 10);
            }
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: remote fetch', function (assert) {
        expect(2);

        var book = new BookModel({
            title: 'Book title',
            author: 'Book author'
        });
        var books = new BookCollection();

        book.set({id: 4});
        books.add(book);
        book.fetch({
            local: false,
            autoSync: false,
            success: function (model, response) {
                assert.equal(response.author, 'John Steinbeck');
                assert.equal(book.get('author'), 'John Steinbeck');
            },
        });

        QUnit.start();
    });

    QUnit.asyncTest('model: local save & fetch', function (assert) {
        expect(4);

        var book = new BookModel({
            title: 'Book title',
            author: 'Book author'
        });
        var books = new BookCollection();

        book.save(null, {
            remote: false,
            autoSync: false,
            success: function (model, response) {
                assert.deepEqual(response, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.uuid), book.toJSON());
            }
        });

        book.fetch({
            remote: false,
            autoSync: false,
            success: function (model, response) {
                assert.deepEqual(response, book.toJSON());
                assert.deepEqual(localStorage.getObject(book.uuid), book.toJSON());
            }
        });

        QUnit.start();
    });

}());
