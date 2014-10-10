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

    var book = new BookModel({
        title: 'Book title',
        author: 'Book author'
    });

    var books = new BookCollection();

    var bookJson = JSON.stringify(book);

    QUnit.asyncTest('collection fetch', function (assert) {
        expect(5);

        // local
        books.fetch({
            remote: false,
            autoSync: false,
            success: function (model, response) {
                assert.deepEqual(response, []);
                assert.equal(books.length, 0);
            }
        });

        // remote
        fauxServer.enable(false);
        books.fetch({
            local: false,
            autoSync: false,
            error: function (model, response, options) {
                assert.equal(books.length, 0);
            }
        });

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

    QUnit.asyncTest('local model save', function (assert) {
        book.save(null, {
            remote: false,
            autoSync: false,
            success: function (model, response) {
                assert.equal(localStorage.getObject(book.uuid), bookJson);
                assert.equal(JSON.stringify(book), bookJson);
            }
        });

        book.fetch({
            remote: false,
            autoSync: false,
            success: function (model, response) {
                console.log('response ', response);
                console.log('bookJson ', bookJson);
                assert.equal(response, bookJson);
                console.log('JSON.stringify(book)', JSON.stringify(book));
                assert.equal(JSON.stringify(book), bookJson);
            }
        });

        QUnit.start();
    });

}());
