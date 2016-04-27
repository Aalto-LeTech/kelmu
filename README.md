# Kelmu toolkit for augmenting JavaScript animations

Kelmu provides a transparent layer on top of
JavaScript-based animations that can contain annotations
such as text and arrows for each animation step.

## Loading augmentations

Load the Kelmu library and its stylesheet. The jQuery
(tested with version 1.9.1) library must be loaded before
loading Kelmu.

### Automatic loading

Wrap the animation element with a `div` element with the
following attributes:

```html
<div class="kelmu" data-kelmu-id="name" data-kelmu-definition="http://myserver/definition.jsonp"></div>
```

The attribute `data-kelmu-id` contains the unique id of the
augmentations (there can be many of them in the same
definition file) and `data-kelmu-definition` contains the
URL for the definition file.

If the file extension is `jsonp`, the file will be
downloaded by using JSONP and the same-origin policy
restriction can be avoided. However, the definition file
must be in that case wrapped inside `kelmuCb` function.
Exporting definitions from the editor does this
automatically.


### Customized loading

Instead of using automatic downloading of definition files,
it is possible to customize the process.

```javascript
window.kelmu.data['name'] = {}; // replace with the definition
window.kelmu.initAnnotations($('#element'), 'name');
```

Definitions must be placed to the `window.kelmu.data` and after
that call `initAnnotations` function.

## Using the editor

The Kelmu editor will be available if `kelmu.editor.js` is
loaded. The editor requires the jQuery UI library and the
corresponding stylesheet. There will be a link below the
animation to launch the editor.

### Implementing custom behavior

It is possible to add callback functions to the array
`window.kelmu.afterModificationCallbacks`. All the
functions in the array are called always after the
augmentations are modified. The animation id will be the
first (and only) parameter when callback functions are
called.

This feature can be used, for example, to create
a custom way to save the augmentations. The definitions are
available in `window.kelmu.data[id]`.

## License

Copyright Teemu Sirkiä and Aalto University, 2016.
Licensed under MIT license.
