var expect = chai.expect;

describe('Backbone local cache', function () {
  var BookModel;

  beforeEach(function () {
    $.ajaxSetup({async: false});
    localStorage.clear();

    BookModel = Backbone.Model.extend({
        modelClassId: 'book-model',
        defaults: {
            title: 'Unknown title',
            author: 'Unknown author'
        },
        urlRoot: 'http://localhost:3000/book'
    });
  });

  beforeEach(reset);

  describe('server: down, no cache', function () {
    beforeEach(function () {
      return serverStatus('down');
    });

    it('should return an error', function (done) {
      var book = new BookModel();
      return book.save().fail(function (err) {
        expect(err).to.exists;
        done();
      });
    });
  });

  describe('server: down, with cache', function () {
    var book;
    beforeEach(function () {
      book = new BookModel();

      return serverStatus('up').then(function () {
        return book.save({foo: 'bar'});
      })
      .then(function () {
        return serverStatus('down');
      });
    });

    it('should not return an error', function (done) {
      return book.save({foo: 'bar'}).then(function (res) {
        expect(res).to.have.property('title', 'Unknown title');
        done();
      });
    });
  });

  describe('server: up, with cache', function () {
    var book;
    beforeEach(function () {
      book = new BookModel();

      return serverStatus('up').then(function () {
        return book.save({foo: 'bar'}, {patch: true});
      }).then(function (res) {
        return $.ajax({
          url: 'http://localhost:3000/book/' + res.id,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          data: JSON.stringify({
            title: 'serverTitle'
          })
        });
      });
    });

    it('should return data from server', function (done) {
      return book.save({foo: 'bar'}, {patch: true}).then(function (res) {
        expect(res).to.have.property('title', 'serverTitle');
        done();
      });
    });
  });
});

/**
 * Reset server state.
 *
 * @returns {Promise}
 */

function reset() {
  return $.get('http://localhost:3001/reset');
}

/**
 * Change the server status.
 *
 * @param {string} status "up" or "down"
 * @returns {Promise}
 */

function serverStatus(status) {
  return $.ajax({
      url: 'http://localhost:3001/status',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({status: status})
  });
}
