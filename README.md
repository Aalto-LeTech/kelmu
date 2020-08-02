# Kelmu toolkit for augmenting JavaScript animations

Kelmu provides a transparent layer on top of JavaScript-based animations that can contain annotations such as text and arrows for each animation step. Check out [this video](https://www.youtube.com/watch?v=Q3T_QLRWb78) in YouTube to see Kelmu in use.

## Gist

Using Kelmu to augment the animation in the `div#animation` element.

```html
<!doctype html>
<html>
  <head>  
   <title>Example</title>     
     <script src="libs/jquery.min.js" type="text/javascript"></script>
     <script src="kelmu.js" type="text/javascript"></script>
     <link href="kelmu.css" rel="stylesheet">     
  </head>

  <body>
     <div id="animation" data-kelmu-id="example" data-kelmu-definition="http://myserver/example.jsonp"></div>
  </body>
</html>
```

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


## Requirements for the animator

In order to use Kelmu, the animator must have certain features so that Kelmu can attach to it.

 * The animation must be on the same page with Kelmu, the animation cannot be inside `iframe` element.
 * Button handlers of the animation must be set by using jQuery.
 * Animation must proceed deterministically and always in the same way.
 * The layout of the animation must be fixed as the augmentation positions are stored as coordinates on the screen.
 * If the animator does not support the message passing, the transition animation between the steps must always have a constant duration.


## Using the editor

The Kelmu editor will be available if `kelmu.editor.js` is loaded. The editor requires the jQuery UI library and the corresponding stylesheet. When the editor is loaded, there will be a link below the animation to launch the editor.

Add these lines after loading the Kelmu library:

```javascript
<script src="kelmu.editor.js" type="text/javascript"></script>
<link href="libs/jquery-ui/jquery-ui.min.css" rel="stylesheet">
<script src="libs/jquery-ui/jquery-ui.min.js"></script>
```

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

## Communication between Kelmu and animator

Kelmu implements a simple interface to enable two-way communication between the animator and Kelmu. Implementing this feature in the animator is optional but Kelmu will work better if the additional information is available.

```javascript
// Register a callback
window.kelmu.registerCallback(animationId, function (action, parameter, payload) {
  // a message received
}

// Send a request and response

window.kelmu.sendMessage(animationId, 'getAnimationCapabilities');

window.kelmu.sendMessage(animationId, 'animationCapabilities', null, ['animationReady']);
```

Sending a request, the action name starts with the `get` prefix and the parameter and payload are typically `undefined`. When responding, parameter is expected to be a single value or `null`. Payload can be any data related to that particular message.

When Kelmu is loaded, it tries to send the following messages to the animator: `getCapabilities` , `getAnimationLength`, `getButtonDefinitions`, `getCurrentStep`.

After receiving a message `getSomething`, the response should be in the message having the same name without the `get` prefix, i.e. `something` in this case.

### `getCapabilities`

Kelmu asks the animator what kind of features the animator supports. The animator should send a message `capabilities`. The parameter is `null` and the payload is an array having the features available. Currently, only `animationReady` is supported. That means that the animator will send a `animationReady` message always after the animation transition has ended and Kelmu should draw new annotations.

### `getAnimationLength`

Kelmu asks the animator how long is the animation transition. The animator should send a message `animationLength`. The parameter should be the value in milliseconds. After waiting this delay, Kelmu will draw the new annotations. If the animator can send `animationReady` messages, this property is ignored.

### `getButtonDefinitions`

Kelmu asks the animator how to find the control buttons. The animator should send a message `buttonDefinitions`. The parameter is `null` and the payload should contain the following object:
```javascript
{ 'step': '#btn-step',
  'redo': '#btn-redo',
  'undo': '#btn-undo',
  'begin': '#btn-begin'
}`
```

The object contains CSS selectors to get the buttons. The selectors are applied inside the animation element. If the animator does not have a button for some actions, the button can be left out.

### `getCurrentStep`

Kelmu asks the animator what is the current step number. The animator should send a message `currentStep` having the current step number as its parameter.

### `showSequence`

Kelmu will send this message if there are combined steps that are shown as a single step. This message will be send always before calling the function to proceed the animation except the last step. The animator can use this message to disable a undo functionality, for example.

### Buttons and actions

Buttons can send arbitrary messages to the animator. The animator can implement any custom features that can be launched by using the messages.

There are two special messages that Kelmu implements: `show` and `skip`. These messages are also passed to the animator but Kelmu execute multiple steps with a single click when receiving this message. The parameter should contain the number of steps to move forward. If the animator supports the `skip` message, it should disable all animations.

It is also possible to use `show` and `skip` as actions that occur when leaving the current step by using an action with `step` as its `when` modifier.

An action with step modifier `enter` is sent to the animator always when moving to that particular step.

## Publications

Teemu Sirkiä and Juha Sorva. 2015. [Tailoring animations of example programs](https://doi.org/10.1145/2828959.2828965). In Proceedings of the 15th Koli Calling Conference on Computing Education Research (Koli Calling ’15). Association for Computing Machinery, New York, NY, USA, 147–151.

Teemu Sirkiä. 2016. [Jsvee & Kelmu: Creating and tailoring program animations for computing education.](https://doi.org/10.1109/VISSOFT.2016.24) 2016 IEEE Working
Conference on Software Visualization (VISSOFT), 36–45

Teemu Sirkiä. 2017. [Creating, Tailoring, and Distributing Program Animations - Supporting the Production Process of Interactive Learning Content](http://urn.fi/URN:ISBN:978-952-60-7544-0)
PhD Thesis, Aalto University

## License

Copyright Teemu Sirkiä and Aalto University, 2016.
Licensed under MIT license.
