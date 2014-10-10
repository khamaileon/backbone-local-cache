/*global _, fauxServer */

// Note that since `fauxServer` is attached to the global window object, you can use the console to
//  flip between BFS routes / Backbone's native transport. (use `fauxServer.enable()` /
//  `fauxServer.enable(false)`)

(function () {

    "use strict";

    var booksAttrs;

    fauxServer
        .get("books", function () {
            return _.toArray(booksAttrs);
        })
        .get("books/:id", function (context, bookId) {
            var book = _.find(booksAttrs, function (book) { return book.id === bookId });
            return book || ("404 - no book found of id " + bookId);
        });

    booksAttrs = {
        gatsby: {
            id: 1,
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            year: 1925
        },
        catcher: {
            id: 2,
            title: 'The Catcher in the Rye',
            author: 'J.D. Salinger',
            year: 1951
        },
        mockingbird: {
            id: 3,
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            year: 1960
        },
        mice: {
            id: 4,
            title: 'Of Mice and Men',
            author: 'John Steinbeck',
            year: 1937
        },
        sea: {
            id: 5,
            title: 'The Old Man and the Sea',
            author: 'Ernest Hemingway',
            year: 1951
        },
        scarlet: {
            id: 6,
            title: 'The Scarlet Letter',
            author: 'Nathaniel Hawthorne',
            year: 1850
        },
        five: {
            id: 7,
            title: 'Slaughterhouse-Five',
            author: 'Kurt Vonnegut',
            year: 1969
        },
        whale: {
            id: 8,
            title: 'Moby-Dick',
            author: 'Herman Melville',
            year: 1851
        },
        sawyer: {
            id: 9,
            title: 'The Adventures of Tom Sawyer',
            author: 'Mark Twain',
            year: 1876
        },
        fahrenheit: {
            id: 10,
            title: 'Fahrenheit 451',
            author: 'Ray Bradbury',
            year: 1953
        }
    };
}());
