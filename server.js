var express = require('express');
var _ = require('lodash');
var http = require('http');
var bodyParser = require('body-parser');
var cors = require('cors');

var books, users, cards;

function reset() {
  books = {
      1: {
          id: 1,
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          year: 1925
      },
      2: {
          id: 2,
          title: 'The Catcher in the Rye',
          author: 'J.D. Salinger',
          year: 1951
      },
      3: {
          id: 3,
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          year: 1960
      },
      4: {
          id: 4,
          title: 'Of Mice and Men',
          author: 'John Steinbeck',
          year: 1937
      },
      5: {
          id: 5,
          title: 'The Old Man and the Sea',
          author: 'Ernest Hemingway',
          year: 1951
      },
      6: {
          id: 6,
          title: 'The Scarlet Letter',
          author: 'Nathaniel Hawthorne',
          year: 1850
      },
      7: {
          id: 7,
          title: 'Slaughterhouse-Five',
          author: 'Kurt Vonnegut',
          year: 1969
      },
      8: {
          id: 8,
          title: 'Moby-Dick',
          author: 'Herman Melville',
          year: 1851
      },
      9: {
          id: 9,
          title: 'The Adventures of Tom Sawyer',
          author: 'Mark Twain',
          year: 1876
      },
      10: {
          id: 10,
          title: 'Fahrenheit 451',
          author: 'Ray Bradbury',
          year: 1953
      }
  };

  users = {};
  cards = {};
}

var app = express();
var appServer = new http.Server(app);

// Body parser.
app.use(bodyParser.json());

// Enable CORS.
app.use(cors());

// Disable keep-alive.
app.use(function (req, res, next) {
  res.set('Connection', 'close');
  next();
});

// Books
app.get('/book', function (req, res) {
    return res.send(_.toArray(books));
});

app.get('/book/:id', function (req, res) {
    if (!books[req.params.id])
        return res.status(404).send({});
    return res.send(books[req.params.id]);
});

app.post('/book', function (req, res) {
    var id = 1;
    var titles = _.pluck(books, 'title');
    var authors = _.pluck(books, 'author');

    if (_.contains(titles, req.body.title) && _.contains(authors, req.body.author)) {
        return res.status(400).send({});
    }

    if (!_.isEmpty(books)) {
        var maxId = _.max(books, function (book) { return book.id; });
        id = maxId.id + 1;
    }

    books[id] = req.body;
    books[id].id = id;
    res.status(201).send(books[id]);
});

app.put('/book/:id', function (req, res) {
    if (!books[req.params.id]) {
        return res.status(404).send({});
    }
    books[req.params.id] = req.body;
    res.send(books[req.params.id]);
});

app.patch('/book/:id', function (req, res) {
    if (!books[req.params.id]) {
        return res.status(404).send({});
    }
    _(books[req.params.id]).extend(req.body);
    res.send(books[req.params.id]);
});

// Users
app.get('/user/:id', function (req, res) {
    if (!users[req.params.id]) {
        return res.status(404).send({});
    }

    res.send(users[req.params.id]);
});

app.post('/user', function (req, res) {
    var id = 1;
    if (!_.isEmpty(users)) {
        var maxId = _.max(users, function (user) { return user.id; });
        id = maxId.id + 1;
    }
    users[id] = req.body;
    users[id].id = id;
    res.status(201).send(users[id]);
});

// Library cards
app.get('/card/:id', function (req, res) {
    if (!cards[req.params.id]) {
        return res.status(404).send({});
    }

    res.send(cards[req.params.id]);
});

app.post('card', function (req, res) {
    var id = 1;
    if (!_.isEmpty(cards)) {
        var maxId = _.max(cards, function (card) { return card.id; });
        id = maxId.id + 1;
    }
    cards[id] = req.body;
    cards[id].id = id;
    res.status(201).send(cards[id]);
});

function startApp() {
    appServer.listen(3000);
}

function stopApp() {
    appServer.close();
}

reset();
startApp();

// Monitor.
var monitor = express();
monitor.use(bodyParser.json());
monitor.use(cors());

monitor.post('/status', function (req, res) {
    if (req.body.status === 'up') {
      console.log('server up');
      startApp();
    }
    else {
      console.log('server down');
      stopApp();
    }

    res.send('OK');
});

monitor.get('/reset', function (req, res) {
    reset();
    res.send('OK');
});

monitor.listen(3001, function () {
    console.log('monitor listening on *:3001');
});
