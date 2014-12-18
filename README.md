# backbone-local-cache

[![Build Status](https://travis-ci.org/khamaileon/backbone-local-cache.svg?branch=master)](https://travis-ci.org/khamaileon/backbone-local-cache)

Add offline mode support for Backbone. Using this module, every requests are cached in the localStorage. When you are offline, the application will use data present in the localStorage.

## Install

```js
bower install backbone-local-cache
```

## Usage

```html
<script src="bower_components/backbone/backbone.js"></script>
<script src="bower_components/backbone-local-cache/backbone-local-cache.js"></script>
```

### Backbone.LocalCache.CacheStorage

This is the cache storage interface, it will use the localStorage of the browser.

But you can implement you own method by replacing the method get and set.

## License

MIT
