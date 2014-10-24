/*global $, _, Backbone, QUnit, expect, fauxServer, localStorage*/

(function () {
    "use strict";

    $.ajaxSetup({ async: false });

    console.log('fauxServer version: ' + fauxServer.getVersion());
    localStorage.clear();

    var BookModel = Backbone.RelationalModel.extend({
        defaults: {
            title: 'Unknown title',
            author: 'Unknown author'
        },
        urlRoot: 'book'
    }).extend(Backbone.LocalCache.ModelMixin);

    var LibraryCardModel = Backbone.RelationalModel.extend({
        defaults: {
            number: 'Unknown number',
        },
        urlRoot: 'card'
    }).extend(Backbone.LocalCache.ModelMixin);

    var UserModel = Backbone.RelationalModel.extend({
        relations: [{
            type: Backbone.HasOne,
            key: 'card',
            relatedModel: LibraryCardModel,
            reverseRelation: {
                type: Backbone.HasOne,
                key: 'user'
            }
        }],
        defaults: {
            firstName: 'Unknown first name',
            lastName: 'Unknown last name'
        },
        urlRoot: 'user'
    }).extend(Backbone.LocalCache.ModelMixin);

    QUnit.asyncTest('', function (assert) {
        // expect(0);
        localStorage.clear();

        var user = new UserModel({
            firstName: 'John',
            lastName: 'Snow'
        });

        var card = new LibraryCardModel({ number: '254521' });

        assert.deepEqual(user.get('card'), null);
        assert.deepEqual(card.get('user'), null);

        var cardStorageKey,
            userStorageKey;

        card.save(null, {
            remote: false,
            success: function (model, resp, options) {
                cardStorageKey = options.storageKey;
                assert.deepEqual(resp, card.toJSON());
            }
        });
        assert.equal(user.get('card'), null);

        user.set({card: card});
        assert.notEqual(user.get('card'), null);
        assert.notEqual(card.get('user'), null);
        assert.deepEqual(card.toJSON(), user.get('card').toJSON());

        user.save(null, {
            remote: false,
            success: function (model, resp, options) {
                userStorageKey = options.storageKey;
                assert.deepEqual(resp, user.toJSON());
            }
        });

        assert.notEqual(user.get('card'), null);
        assert.equal(card.get('user'), null);
        // assert.deepEqual(card.toJSON(), user.get('card').toJSON());

        user.destroy({remote: false});
        card.destroy({remote: false});

        assert.equal(user.get('card'), null);
        assert.equal(card.get('user'), null);

        var user2 = new UserModel();
        user2.storageKey = userStorageKey;

        var card2 = new LibraryCardModel();
        card2.storageKey = cardStorageKey;

        assert.equal(user2.get('card'), null);
        assert.equal(card2.get('user'), null);

        user2.fetch({
            remote: false,
            success: function (model, resp) {
                // assert.deepEqual(resp, user2.toJSON());
            }
        });

        assert.notEqual(user2.get('card'), null);
        assert.equal(card2.get('user'), null);

        card2.fetch({
            remote: false,
            success: function (model, resp) {
                assert.deepEqual(resp, card2.toJSON());
            }
        });

        assert.notEqual(user2.get('card'), null);
        assert.equal(card2.get('user'), null);

        QUnit.start();
    });

}());