/*jslint nomen: true*/
/*global _, fauxServer*/

// Note that since `fauxServer` is attached to the global window object, you can use the console to
//  flip between BFS routes / Backbone's native transport. (use `fauxServer.enable()` /
//  `fauxServer.enable(false)`)

(function () {

    "use strict";

    var books = {
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

    fauxServer
        .get('books', function () {
            return _.toArray(books);
        })

        .get('books/:id', function (context, bookId) {
            return books[bookId] || ('404 - no book found of id ' + bookId);
        })

        .post('books', function (context) {
            var maxIdBook = _.max(books, function (book) { return book.id; }),
                id = maxIdBook.id + 1;
            books[id] = context.data;
            books[id].id = id;
            return books[id];
        })

        .put('books/:id', function (context, bookId) {
            if (!books[bookId]) { return ('404 - no book found of id ' + bookId); }
            books[bookId] = context.data;
            return books[bookId];
        })

        .patch('books/:id', function (context, bookId) {
            if (!books[bookId]) { return ('404 - no book found of id ' + bookId); }
            _(books[bookId]).extend(context.data);
            return books[bookId];
        });

}());
