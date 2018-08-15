/**
 * Editor for Kelmu annotations.
 * Licensed under MIT license.
 * @author: Teemu Sirkiä, Aalto University (teemu.sirkia@aalto.fi)
 */

(function($) {

  'use strict';

  if (!window.kelmu) {
    return;
  }

  // Initialize all the default values
  if (!window.kelmu.defaults) {
    window.kelmu.defaults = {
      text: {},
      arrow: {},
      button: {},
      line: {},
      sound: {}
    };
  }

  var textDefaults = {
    size: 20,
    rotate: 0,
    color: 'red',
    html: true,
    background: 'transparent',
    font: 'Handlee, sans-serif',
    soundOption: 'always'
  };

  var arrowDefaults = {
    arrow: 'red',
    width: 2,
    size: 6,
    soundOption: 'always'
  };

  var lineDefaults = {
    line: 'red',
    width: 2,
    soundOption: 'always'
  };

  var buttonDefaults = {
    font: 'Handlee, sans-serif',
    size: 15,
    rotate: 0,
    buttonText: 'Continue',
    button: 'show',
    parameter: 2
  };

  var actionDefaults = {
    action: 'show',
    parameter: 2,
    when: 'step'
  };

  var soundDefaults = {
    sound: ''
  };

  window.kelmu.defaults.text = $.extend({}, textDefaults, window.kelmu.defaults.text || {});
  window.kelmu.defaults.arrow = $.extend({}, arrowDefaults, window.kelmu.defaults.arrow || {});
  window.kelmu.defaults.button = $.extend({}, buttonDefaults, window.kelmu.defaults.button || {});
  window.kelmu.defaults.line = $.extend({}, lineDefaults, window.kelmu.defaults.line || {});
  window.kelmu.defaults.action = $.extend({}, actionDefaults, window.kelmu.defaults.action || {});
  window.kelmu.defaults.sound = $.extend({}, soundDefaults, window.kelmu.defaults.sound || {});

  // **********************************************************************************************

  // Callback functions which are called after something changes in editor
  // Callbacks are called with the edited animation's id as their first parameter
  window.kelmu.afterModificationCallbacks = [];

  // **********************************************************************************************

  window.kelmu.createEditor = function(id, element) {

    window.kelmu.data[id].editorMode = true;
    window.kelmu.data[id].selectedElementNumber = -1;
    window.kelmu.data[id].previousSelectedElementNumber = -1;

    var container = $(element);
    var animationId = id;

    var buttonPickerEnabled = true;
    var buttonPickerCreated = false;
    var buttonToPick = null;
    var buttonToPickElement = null;
    var buttonToPickCounter = 0;

    /**
     * Traces mouse moves above buttons in order to bind animation buttons with Kelmu.
     */
    var createButtonPicker = function() {
      element.find('a, button').mousemove(function(e) {
        if (buttonPickerEnabled) {
          if (e.target !== buttonToPickElement) {
            buttonToPickCounter = 0;
            buttonToPickElement = e.target;
          }

          buttonToPickCounter += 1;
          if (buttonToPickCounter > 50) {
            element.find('a, button').css('border', '');
            $(e.target).css('border', 'solid 2px green');

            var createSelector = function(element) {
              if (element.attr('id')) {
                return '#' + element.attr('id');
              } else {
                var classes = element.attr('class').split(/\s/);
                return classes.map(function(x) {
                  return '.' + x;
                }).join('');
              }
            };

            if (buttonToPick === 'undo') {
              editor.find('.kelmu-editor-undo-button').val(createSelector($(e.target)));
            } else if (buttonToPick === 'redo') {
              editor.find('.kelmu-editor-redo-button').val(createSelector($(e.target)));
            } else if (buttonToPick === 'step') {
              editor.find('.kelmu-editor-step-button').val(createSelector($(e.target)));
            } else if (buttonToPick === 'begin') {
              editor.find('.kelmu-editor-begin-button').val(createSelector($(e.target)));
            }

            buttonPickerEnabled = false;
            buttonToPickCounter = 0;

            setTimeout(function() {
              element.find('a, button').css('border', '');
            }, 5000);

          }
        }
      });
      buttonPickerCreated = true;
    };


    /**
     * Notifies all the callbacks that the definition for this animation has changed.
     * Callbacks are defined in window.kelmu.afterModificationCallbacks
     */
    var notifyModifications = function() {
      $.each(window.kelmu.afterModificationCallbacks, function() {
        this(id);
      });
    };


    /**
     * Clears the CSS rotation of an element. The function should be called
     * so that `this` referes to the element.
     */
    var resetRotation = function() {
      var elem = $(this);
      var data = window.kelmu.data[id];
      data.selectedElementNumber = parseInt(elem.attr('data-annotation'), 10);
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      if (elemData.rotate) {
        elem.css('transform', 'none');
        elem.css('moz-transform', 'none');
        elem.css('webkit-transform', 'none');
        elem.css('ms-transform', 'none');
      }
    };


    /**
     * Restores the CSS rotation of an element. The function should be called
     * so that `this` referes to the element.
     */
    var restoreRotation = function() {
      var elem = $(this);
      var data = window.kelmu.data[id];
      data.selectedElementNumber = parseInt(elem.attr('data-annotation'), 10);
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      if (elemData.rotate) {
        elem.css('transform', 'rotate(' + elemData.rotate + 'deg)');
        elem.css('moz-transform', 'rotate(' + elemData.rotate + 'deg)');
        elem.css('webkit-transform', 'rotate(' + elemData.rotate + 'deg)');
        elem.css('ms-transform', 'rotate(' + elemData.rotate + 'deg)');
      }

      elem.css('background-color', elemData.background);

    };


    /**
     * Updates the position definition for the selected element.
     * The function should be called so that `this` referes to the element.
     */
    var updatePosition = function() {
      var elem = $(this);
      var data = window.kelmu.data[id];
      data.selectedElementNumber = parseInt(elem.attr('data-annotation'), 10);
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];
      elemData.top = parseFloat(elem.css('top'));
      elemData.left = parseFloat(elem.css('left'));

      if (elem.hasClass('kelmu-annotation')) {
        elemData.height = elem.height();
        elemData.width = elem.width();
      }
    };


    /**
     * Makes the annotations to be moveable in the editor.
     */
    var makeMoveable = function() {
      container.find('.kelmu-annotation, .kelmu-button').mousedown(resetRotation);
      container.find('.kelmu-annotation, .kelmu-button').mouseup(restoreRotation);

      container.find('.kelmu-annotation, .kelmu-button').draggable({
        start: function() {
          var elem = $(this);
          var data = window.kelmu.data[id];
          data.selectedElementNumber = parseInt(elem.attr('data-annotation'), 10);
          resetRotation.call(this);
        },
        stop: function() {
          restoreRotation.call(this);
          updatePosition.call(this);
          notifyModifications();
          updateView(false, true);
        }
      });

      container.find('.kelmu-annotation-content, .kelmu-button').css('cursor', 'move');

    };


    /**
     * Makes the annotations to be resizable in the editor.
     */
    var makeResizable = function() {
      container.find('.kelmu-annotation').resizable({
        start: function() {
          var elem = $(this);
          var data = window.kelmu.data[id];
          data.selectedElementNumber = parseInt(elem.attr('data-annotation'), 10);
          if (elem.css('background-color') === 'transparent' || elem.css('background-color') === 'rgba(0, 0, 0, 0)') {
            elem.css('background-color', 'rgba(0, 0, 0, 0.1)');
          }
        },
        stop: function() {
          restoreRotation.call(this);
          updatePosition.call(this);
          notifyModifications();
          updateView(false, true);
        }
      });
    };


    /**
     * Selects and changes the current element after clicking it.
     * The function should be called so that `this` referes to the element.
     */
    var clickableFunction = function(event) {
      if (event.ctrlKey) {
        return;
      }
      event.preventDefault();
      var elem = $(this);
      var data = window.kelmu.data[id];
      data.selectedElementNumber = parseInt(elem.attr('data-annotation'), 10);
      updateView(false, true);
    };


    /**
     * Makes the annotations to be clickable in the editor.
     */
    var makeClickable = function() {
      container.find('.kelmu-annotation, .kelmu-button, .kelmu-arrow-handle').click(clickableFunction);
    };


    /**
     * Draws the handles for moving arrows in the editor.
     */
    var drawArrowHandles = function() {

      var data = window.kelmu.data[id];

      if (!data.definitions['step' + data.stepNumber] || !data.definitions['step' + data.stepNumber][data.subStepNumber]) {
        return;
      }

      var step = data.definitions['step' + data.stepNumber][data.subStepNumber];

      container.find('.kelmu-arrow-handle').remove();

      var arrowCounter = 0;
      $.each(step, function(index) {

        if (this.arrow || this.line) {

          var handle1 = $('<div></div>').addClass('kelmu-arrow-handle').attr('data-arrow', arrowCounter).attr('data-type', 'start').attr('data-annotation', index);
          var handle2 = $('<div></div>').addClass('kelmu-arrow-handle').attr('data-arrow', arrowCounter).attr('data-type', 'end').attr('data-annotation', index);
          var handle3 = $('<div></div>').addClass('kelmu-arrow-handle').attr('data-arrow', arrowCounter).attr('data-type', 'middle').attr('data-annotation', index);
          handle1.prependTo(container);
          handle2.prependTo(container);
          handle3.prependTo(container);

          var self = this;
          var arrow = container.find('svg path#arrow-' + arrowCounter);
          arrow.attr('data-prev-x', (self.x2 + self.x1) / 2);
          arrow.attr('data-prev-y', (self.y2 + self.y1) / 2);

          container.find('.kelmu-arrow-handle').css('position', 'absolute').css('cursor', 'move').draggable({
            start: function() {
              $('body').css('cursor', 'move');
            },
            stop: function() {
              $('body').css('cursor', 'auto');
              notifyModifications();
              updateView(true, true);
            }
          });

          handle1.css('top', this.y1);
          handle1.css('left', this.x1);
          handle2.css('top', this.y2);
          handle2.css('left', this.x2);
          handle3.css('top', (this.y2 + this.y1) / 2);
          handle3.css('left', (this.x2 + this.x1) / 2);

          container.find('.kelmu-arrow-handle').on('drag', function(event, ui) {

            var elem = $(this);
            data.selectedElementNumber = parseInt(elem.attr('data-annotation'), 10);

            var arrow = container.find('svg path#arrow-' + $(this).attr('data-arrow'));
            var isStart = $(this).attr('data-type') === 'start';
            var isEnd = $(this).attr('data-type') === 'end';
            var isMiddle = $(this).attr('data-type') === 'middle';
            var previous = arrow.attr('d').split(' ');

            var number = elem.attr('data-annotation');
            var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][number];

            if (isStart) {
              arrow.attr('d', 'M ' + ui.position.left + ' ' + ui.position.top + ' L ' + previous[4] + ' ' + previous[5]);
              elemData.x1 = ui.position.left;
              elemData.y1 = ui.position.top;
              container.find('.kelmu-arrow-handle[data-annotation="' + elem.attr('data-annotation') + '"][data-type!="start"]').hide();
            } else if (isEnd) {
              arrow.attr('d', 'M ' + previous[1] + ' ' + previous[2] + ' L ' + ui.position.left + ' ' + ui.position.top);
              elemData.x2 = ui.position.left;
              elemData.y2 = ui.position.top;
              container.find('.kelmu-arrow-handle[data-annotation="' + elem.attr('data-annotation') + '"][data-type!="end"]').hide();
            } else if (isMiddle) {
              var prevX = parseFloat(arrow.attr('data-prev-x'));
              var prevY = parseFloat(arrow.attr('data-prev-y'));
              var dx = ui.position.left - prevX;
              var dy = ui.position.top - prevY;
              arrow.attr('d', 'M ' + (parseFloat(previous[1]) + dx) + ' ' + (parseFloat(previous[2]) + dy) + ' L ' + (parseFloat(previous[4]) + dx) + ' ' + (parseFloat(previous[5]) + dy));
              elemData.x1 = parseFloat(previous[1]) + dx;
              elemData.y1 = parseFloat(previous[2]) + dy;
              elemData.x2 = parseFloat(previous[4]) + dx;
              elemData.y2 = parseFloat(previous[5]) + dy;
              container.find('.kelmu-arrow-handle[data-annotation="' + elem.attr('data-annotation') + '"][data-type!="middle"]').hide();
            }

            arrow.attr('data-prev-x', (elemData.x2 + elemData.x1) / 2);
            arrow.attr('data-prev-y', (elemData.y2 + elemData.y1) / 2);

          });

          var handlers = container.find('.kelmu-arrow-handle');
          handlers.css('opacity', 0.2).css('margin-left', '-5px').css('margin-top', '-5px').css('width', '10px');
          handlers.css('height', '10px').css('border-radius', '5px').css('background-color', 'black').css('z-index', 52000);

          arrowCounter += 1;

        }
      });
    };


    /**
     * Updates the editor view. If the parameter force is true, all the
     * annotation elements are made clickable, moveable and resizable.
     */
    var updateView = function(force, noDelay) {

      if (!window.kelmu.data[id].editorMode) {
        return;
      }

      buttonPickerEnabled = false;

      editor.css('height', '');
      editor.css('width', '');

      var step = window.kelmu.data[id].stepNumber + 1;
      var substep = window.kelmu.data[id].subStepNumber + 1;
      var substeps = (window.kelmu.data[id].definitions['step' + (step - 1)] || [null]).length;
      container.find('div.kelmu-editor-status').text('Step ' + step + ', substep ' + substep + ' of ' + substeps);

      if (window.kelmu.data[id].selectedElementNumber < 0) {
        // There is no selected element at the moment, remove the settings for the previous
        container.find('.kelmu-editor-pane').remove();
        force = true;
      }

      var data = window.kelmu.data[id];

      // Add components to the editor (action events and sounds)
      var componentPanel = container.find('.kelmu-editor-components');
      componentPanel.children().remove();
      if (data.definitions['step' + data.stepNumber]) {
        var componentList = $('<ul></ul>').appendTo(componentPanel);
        $.each(data.definitions['step' + data.stepNumber][data.subStepNumber], function(index) {
          var li, link;
          if (this.action !== undefined) {
            li = $('<li></li>').appendTo(componentList);
            link = $('<a href="#"></a>').appendTo(li).attr('data-annotation', index);
            link.text('Action (' + this.action + ' ' + this.parameter + ', ' + this.when + ')');
            link.addClass('kelmu-action-component');
            link.click(clickableFunction);
          } else if (this.sound !== undefined) {
            li = $('<li></li>').appendTo(componentList);
            link = $('<a href="#"></a>').appendTo(li).attr('data-annotation', index);
            link.text('Sound');
            link.addClass('kelmu-annotation-sound-component');
            link.click(clickableFunction);
          }
        });
      }

      // If the selected element has changed, update the editor
      if (window.kelmu.data[id].selectedElementNumber >= 0 && window.kelmu.data[id].selectedElementNumber !== window.kelmu.data[id].previousSelectedElementNumber) {
        var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];
        if (elemData.text) {
          createTextEditor();
        } else if (elemData.button !== undefined) {
          createButtonEditor();
        } else if (elemData.arrow !== undefined) {
          createArrowEditor();
        } else if (elemData.line !== undefined) {
          createLineEditor();
        } else if (elemData.action !== undefined) {
          createActionEditor();
        } else if (elemData.sound !== undefined) {
          createSoundEditor();
        }
      }

      // Make elements interactive if needed
      if (force || window.kelmu.data[id].selectedElementNumber !== window.kelmu.data[id].previousSelectedElementNumber) {
        container.find('.kelmu-arrow-handle').remove();

        var updateFunction = function() {
          drawArrowHandles();
          makeMoveable();
          makeResizable();
          makeClickable();
        };
        if (!noDelay) {
          setTimeout(updateFunction, window.kelmu.data[id].settings.animationLength);
        } else {
          updateFunction();
        }
      }

      window.kelmu.data[id].previousSelectedElementNumber = window.kelmu.data[id].selectedElementNumber;

    };

    var idCounter = 0;

    /**
     * A helper function for adding input elements to the editor pane.
     */
    var addComponent = function(text, container, name, value, type, noBr) {
      var idNumber = idCounter;
      if (!noBr) {
        $('<br>').appendTo(container);
      }
      $('<label></label>').attr('for', animationId + '-' + name + '-' + idNumber).text(text).appendTo(container);
      if (type === 'text') {
        $('<input type="text"></input>').addClass(name).attr('id', animationId + '-' + name + '-' + idNumber).val(value).appendTo(container);
      } else if (type === 'checkbox') {
        $('<input></input>').addClass(name).attr('type', 'checkbox').attr('id', animationId + '-' + name + '-' + idNumber).prop('checked', value).appendTo(container);
      } else if (type === 'textarea') {
        $('<textarea></textarea>').addClass(name).attr('id', animationId + '-' + name + '-' + idNumber).val(value).appendTo(container);
      }
      idCounter += 1;
    };


    /**
     * Constructs the user interface for the editor.
     */
    var initUI = function() {
      var editor = $('<div></div>').addClass('kelmu-editor').css('z-order', '60000');
      editor.css('position', 'absolute').css('top', '10px').css('left', (container.children('div').last().outerWidth() + 100) + 'px');
      editor.css('border-radius', '5px').css('box-shadow', '3px 3px 5px #888888').css('background-color', '#FFFAE5');
      editor.css('padding', '10').css('cursor', 'move').draggable();
      editor.appendTo(container);

      editor.append($('<h3>Annotation editor</h3>').css('margin', '5px 0px'));

      // *********************************************************************************************************

      var statusView = $('<div></div>').text('Step 1, substep 1 of 1').addClass('kelmu-editor-status');
      statusView.appendTo(editor);

      // *********************************************************************************************************

      var generalButtons = $('<div></div>').addClass('kelmu-editor-general-buttons');
      generalButtons.appendTo(editor);

      $('<button></button>').text('Settings').addClass('btn').appendTo(generalButtons).click(function(e) {
        e.preventDefault();
        container.find('.kelmu-editor-pane').remove();
        editor.css('height', '');
        editor.css('width', '');
        window.kelmu.data[id].selectedElementNumber = -1;
        window.kelmu.data[id].previousSelectedElementNumber = -1;

        var settingsPanel = $('<div></div>').addClass('kelmu-editor-pane').appendTo(editor);

        addComponent('Length (ms)', settingsPanel, 'kelmu-editor-animation-length', window.kelmu.data[id].settings.animationLength, 'text');

        var helpShown = false;

        var pickerFunction = function() {

          if (!helpShown) {
            alert('Move the mouse cursor on top of the button and\nkeep moving the cursor until it gets a green border.');
            helpShown = true;
          }

          buttonPickerEnabled = true;
          element.find('a, button').css('border', '');
          if (!buttonPickerCreated) {
            createButtonPicker();
          }
        };

        addComponent('Begin button', settingsPanel, 'kelmu-editor-begin-button', window.kelmu.data[id].settings.begin, 'text');
        $('<br>').appendTo(settingsPanel);
        $('<button></button>').text('Point Begin button').appendTo(settingsPanel).click(function(e) {
          e.preventDefault();
          buttonToPick = 'begin';
          pickerFunction();
        });
        $('<br>').appendTo(settingsPanel);

        addComponent('Undo button', settingsPanel, 'kelmu-editor-undo-button', window.kelmu.data[id].settings.undo, 'text');
        $('<br>').appendTo(settingsPanel);
        $('<button></button>').text('Point Undo button').appendTo(settingsPanel).click(function(e) {
          e.preventDefault();
          buttonToPick = 'undo';
          pickerFunction();
        });
        $('<br>').appendTo(settingsPanel);

        addComponent('Step button', settingsPanel, 'kelmu-editor-step-button', window.kelmu.data[id].settings.step, 'text');
        $('<br>').appendTo(settingsPanel);
        $('<button></button>').text('Point Step button').appendTo(settingsPanel).click(function(e) {
          e.preventDefault();
          buttonToPick = 'step';
          pickerFunction();
        });
        $('<br>').appendTo(settingsPanel);

        addComponent('Redo button', settingsPanel, 'kelmu-editor-redo-button', window.kelmu.data[id].settings.redo, 'text');
        $('<br>').appendTo(settingsPanel);
        $('<button></button>').text('Point Redo button').appendTo(settingsPanel).click(function(e) {
          e.preventDefault();
          buttonToPick = 'redo';
          pickerFunction();
        });
        $('<br>').appendTo(settingsPanel);

        $('<button></button>').text('Save settings').appendTo($('<p></p>').appendTo(settingsPanel)).click(function(e) {
          e.preventDefault();

          window.kelmu.data[id].settings.animationLength = parseInt(settingsPanel.find('.kelmu-editor-animation-length').val(), 10);
          window.kelmu.data[id].settings.undo = settingsPanel.find('.kelmu-editor-undo-button').val();
          window.kelmu.data[id].settings.step = settingsPanel.find('.kelmu-editor-step-button').val();
          window.kelmu.data[id].settings.redo = settingsPanel.find('.kelmu-editor-redo-button').val();
          window.kelmu.data[id].settings.begin = settingsPanel.find('.kelmu-editor-begin-button').val();

          buttonPickerEnabled = false;

          window.kelmu.data[id].actions.update();
          updateView(true, true);
          window.kelmu.data[id].actions.initButtons();

          alert('Settings saved.');

        });

      });

      $('<button></button>').text('Import').addClass('btn').appendTo(generalButtons).click(function(e) {
        e.preventDefault();
        container.find('.kelmu-editor-pane').remove();
        editor.css('height', '');
        editor.css('width', '');
        window.kelmu.data[id].selectedElementNumber = -1;
        window.kelmu.data[id].previousSelectedElementNumber = -1;

        var importPanel = $('<div></div>').addClass('kelmu-editor-pane').appendTo(editor);
        var helpLabel = $('<p></p>').css('font-size', '11px').appendTo(importPanel);
        helpLabel.text('Copy and paste the definition below.');
        var textarea = $('<textarea></textarea>').appendTo(importPanel);
        textarea.css('font-size', '10px').css('min-height', '200px');
        $('<button></button>').text('Import').appendTo($('<p></p>').appendTo(importPanel)).click(function(e) {
          e.preventDefault();

          var text = textarea.val().trim();
          if (text.indexOf('kelmuCb(') >= 0) {
            text = text.substring(8, text.length - 1);
          }

          try {
            var parsed = JSON.parse(text);
            if (parsed[id] && parsed[id].settings && parsed[id].definitions) {
              window.kelmu.data[id].settings = parsed[id].settings;
              window.kelmu.data[id].definitions = parsed[id].definitions;
              alert('Definitions succesfully imported.');
              window.kelmu.data[id].actions.update();
              updateView(true, true);
              window.kelmu.data[id].actions.initButtons();
            } else {
              alert('Definition for ' + id + ' was not found or it is incomplete!');
            }
          } catch (error) {
            alert('Malformed definition!');
          }

        });
      });

      $('<button></button>').text('Export json').addClass('btn').appendTo(generalButtons).click(function(e) {
        e.preventDefault();
        container.find('.kelmu-editor-pane').remove();
        editor.css('height', '');
        editor.css('width', '');
        window.kelmu.data[id].selectedElementNumber = -1;
        window.kelmu.data[id].previousSelectedElementNumber = -1;

        var exportedData = {};
        exportedData[id] = { definitions: window.kelmu.data[id].definitions, settings: window.kelmu.data[id].settings };

        var exportPanel = $('<div></div>').addClass('kelmu-editor-pane').appendTo(editor);
        var helpLabel = $('<p></p>').css('font-size', '11px').appendTo(exportPanel);
        helpLabel.text('Copy and paste the following definition in a file with extension .json');
        var textarea = $('<textarea></textarea>').appendTo(exportPanel);
        textarea.css('font-size', '10px').css('min-height', '200px');
        textarea.val(JSON.stringify(exportedData));
      });

      $('<button></button>').text('Export jsonp').addClass('btn').appendTo(generalButtons).click(function(e) {
        e.preventDefault();
        container.find('.kelmu-editor-pane').remove();
        editor.css('height', '');
        editor.css('width', '');
        window.kelmu.data[id].selectedElementNumber = -1;
        window.kelmu.data[id].previousSelectedElementNumber = -1;

        var exportedData = {};
        exportedData[id] = { definitions: window.kelmu.data[id].definitions, settings: window.kelmu.data[id].settings };

        var exportPanel = $('<div></div>').addClass('kelmu-editor-pane').appendTo(editor);
        var helpLabel = $('<p></p>').css('font-size', '11px').appendTo(exportPanel);
        helpLabel.text('Copy and paste the following definition in a file with extension .jsonp');
        var textarea = $('<textarea></textarea>').appendTo(exportPanel);
        textarea.css('font-size', '10px').css('min-height', '200px');
        textarea.val('kelmuCb(' + JSON.stringify(exportedData) + ')');
      });

      // *********************************************************************************************************

      var buttons = $('<div></div>').addClass('kelmu-editor-move-buttons');
      buttons.appendTo(editor);

      // Previous substep
      $('<button></button>').text('<').addClass('btn').appendTo(buttons).click(function(e) {
        e.preventDefault();
        if (window.kelmu.data[id].subStepNumber > 0) {
          window.kelmu.data[id].actions.setSubstep(window.kelmu.data[id].subStepNumber - 1);
        }
        window.kelmu.data[id].selectedElementNumber = -1;
        updateView(true, false);
      });

      // Next substep
      $('<button></button>').text('>').addClass('btn').appendTo(buttons).click(function(e) {
        e.preventDefault();
        if (window.kelmu.data[id].subStepNumber < (window.kelmu.data[id].definitions['step' + window.kelmu.data[id].stepNumber] || []).length - 1) {
          window.kelmu.data[id].actions.setSubstep(window.kelmu.data[id].subStepNumber + 1);
        }
        window.kelmu.data[id].selectedElementNumber = -1;
        updateView(true, false);
      });

      // New substep
      $('<button></button>').text('+Substep').addClass('btn').appendTo(buttons).click(function(e) {
        e.preventDefault();

        if (!window.kelmu.data[id].definitions['step' + window.kelmu.data[id].stepNumber]) {
          // Create new definition block for the substep
          window.kelmu.data[id].definitions['step' + window.kelmu.data[id].stepNumber] = [[]];
        }

        window.kelmu.data[id].definitions['step' + window.kelmu.data[id].stepNumber].splice(window.kelmu.data[id].subStepNumber + 1, 0, []);
        window.kelmu.data[id].actions.setSubstep(window.kelmu.data[id].subStepNumber + 1);
        window.kelmu.data[id].selectedElementNumber = -1;
        updateView(true, false);
        notifyModifications();
      });

      // Remove substep
      $('<button></button>').text('-Substep').addClass('btn').appendTo(buttons).click(function(e) {
        e.preventDefault();
        if ((window.kelmu.data[id].definitions['step' + window.kelmu.data[id].stepNumber] || []).length > 1) {
          if (confirm('Do you really want to remove this substep?')) {
            // Remove the definition block and make sure that the substep in the editor exists
            window.kelmu.data[id].definitions['step' + window.kelmu.data[id].stepNumber].splice(window.kelmu.data[id].subStepNumber, 1);
            window.kelmu.data[id].actions.setSubstep(Math.max(window.kelmu.data[id].subStepNumber - 1, 0));
          }

          window.kelmu.data[id].selectedElementNumber = -1;
          updateView(true, false);
          notifyModifications();
        } else {
          alert('You cannot remove the only substep!');
        }
      });

      // *********************************************************************************************************

      var newButtons = $('<div></div>').addClass('kelmu-editor-new-buttons');
      newButtons.appendTo(editor);

      var createNewButton = function(name, defaults, values) {
        return $('<button></button>').text(name).addClass('btn').appendTo(newButtons).click(function(e) {
          e.preventDefault();
          var data = window.kelmu.data[id];

          // Create new definition array for this step if it doesn't exist
          if (!data.definitions['step' + data.stepNumber]) {
            data.definitions['step' + data.stepNumber] = [[]];
          }

          data.definitions['step' + data.stepNumber][data.subStepNumber].push($.extend({}, values, defaults));
          data.selectedElementNumber = data.definitions['step' + data.stepNumber][data.subStepNumber].length - 1;
          data.actions.update();
          updateView(true, true);
          notifyModifications();
        });
      };

      // New text annotation
      createNewButton('+Text', window.kelmu.defaults.text, {
        text: 'New text',
        width: 400,
        height: 80,
        left: 10,
        top: 10
      }).appendTo(newButtons);

      // New arrow
      createNewButton('+Arrow', window.kelmu.defaults.arrow, {
        y1: 10,
        x1: 10,
        y2: 60,
        x2: 60
      }).appendTo(newButtons);

      // New line annotation
      createNewButton('+Line', window.kelmu.defaults.line, {
        y1: 10,
        x1: 10,
        y2: 60,
        x2: 60
      }).appendTo(newButtons);

      // New button
      createNewButton('+Button', window.kelmu.defaults.button, {}).appendTo(newButtons);

      // New action event
      createNewButton('+Action', window.kelmu.defaults.action, {}).appendTo(newButtons);

      // New sound
      createNewButton('+Sound', window.kelmu.defaults.sound, {}).click(function(e) {
        e.preventDefault();
        container.find('.kelmu-sound-control').show();
      }).appendTo(newButtons);

      // *********************************************************************************************************
      var componentPanel = $('<div></div>').addClass('kelmu-editor-components');
      componentPanel.appendTo(editor);

      // *********************************************************************************************************

      return editor;

    };

    /**
     * A helper function for creating remove buttons
     */
    var createRemoveButton = function() {
      // Remove the element
      return $('<button></button>').text('Remove').addClass('btn').click(function(e) {
        e.preventDefault();
        var data = window.kelmu.data[id];
        data.definitions['step' + data.stepNumber][data.subStepNumber].splice(window.kelmu.data[id].selectedElementNumber, 1);
        window.kelmu.data[id].selectedElementNumber = -1;
        window.kelmu.data[id].actions.update();
        updateView(true, true);
        notifyModifications();
      });
    };


    /**
     * Creates the text editor pane for the selected text annotation.
     */
    var createTextEditor = function() {

      var data = window.kelmu.data[id];
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      editor.find('.kelmu-editor-pane').remove();

      var textEditor = $('<div></div>').addClass('kelmu-annotation-text-editor').addClass('kelmu-editor-pane');
      textEditor.appendTo(editor);

      textEditor.append($('<h4>Text</h4>').css('margin', '15px 0px'));

      idCounter += 1;
      var textAreaContainer = $('<div></div>').appendTo(textEditor);

      // Set the current values
      addComponent('Text:', textAreaContainer, 'kelmu-annotation-text', elemData.text, 'textarea', true);
      addComponent('HTML:', textEditor, 'kelmu-annotation-text-as-html', elemData.html === true, 'checkbox');
      addComponent('Font:', textEditor, 'kelmu-font', elemData.font, 'text');
      addComponent('Font size:', textEditor, 'kelmu-font-size', elemData.size, 'text');
      addComponent('Angle:', textEditor, 'kelmu-rotate', elemData.rotate, 'text');
      addComponent('Color:', textEditor, 'kelmu-annotation-text-color', elemData.color, 'text');
      addComponent('Background:', textEditor, 'kelmu-background-color', elemData.background, 'text');
      addComponent('With sound:', textEditor, 'kelmu-annotation-sound-option', elemData.soundOption, 'text');

      // Move cursor to end
      textEditor.find('.kelmu-annotation-text').focus();
      var val = textEditor.find('.kelmu-annotation-text').val();
      textEditor.find('.kelmu-annotation-text').val('').val(val);

      var buttonContainer = $('<div></div>').appendTo(textEditor);

      // Save the modified properties
      var saveText = function() {
        elemData.text = textEditor.find('.kelmu-annotation-text').val() || '?';
        elemData.html = textEditor.find('.kelmu-annotation-text-as-html').prop('checked') === true;
        elemData.font = textEditor.find('.kelmu-font').val() || window.kelmu.defaults.text.font;
        elemData.size = textEditor.find('.kelmu-font-size').val() || window.kelmu.defaults.text.size;
        elemData.rotate = textEditor.find('.kelmu-rotate').val() || window.kelmu.defaults.text.rotate;
        elemData.background = textEditor.find('.kelmu-background-color').val() || window.kelmu.defaults.text.background;
        elemData.color = textEditor.find('.kelmu-annotation-text-color').val() || window.kelmu.defaults.text.color;
        elemData.soundOption = textEditor.find('.kelmu-annotation-sound-option').val() || window.kelmu.defaults.text.soundOption;
        window.kelmu.data[id].actions.update();
        updateView(true, true);
        notifyModifications();
      };

      textEditor.find('input, textarea').keyup(saveText);
      textEditor.find('input').change(saveText);

      createRemoveButton().appendTo(buttonContainer);

      // Set current properties as default settings
      $('<button></button>').text('Make default').addClass('btn').appendTo(buttonContainer).click(function(e) {
        e.preventDefault();
        window.kelmu.defaults.text.html = textEditor.find('.kelmu-annotation-text-as-html').prop('checked') === true;
        window.kelmu.defaults.text.font = textEditor.find('.kelmu-font').val() || textDefaults.font;
        window.kelmu.defaults.text.size = textEditor.find('.kelmu-font-size').val() || textDefaults.size;
        window.kelmu.defaults.text.rotate = textEditor.find('.kelmu-rotate').val() || textDefaults.rotate;
        window.kelmu.defaults.text.background = textEditor.find('.kelmu-background-color').val() || textDefaults.background;
        window.kelmu.defaults.text.color = textEditor.find('.kelmu-annotation-text-color').val() || textDefaults.color;
        window.kelmu.defaults.text.soundOption = textEditor.find('.kelmu-annotation-sound-option').val() || textDefaults.soundOption;
      });

    };


    /**
     * Creates the text editor pane for the selected button.
     */
    var createButtonEditor = function() {

      var data = window.kelmu.data[id];
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      editor.find('.kelmu-editor-pane').remove();

      var buttonEditor = $('<div></div>').addClass('kelmu-button-editor').addClass('kelmu-editor-pane');
      buttonEditor.appendTo(editor);

      buttonEditor.append($('<h4>Button</h4>').css('margin', '15px 0px'));

      idCounter += 1;

      // Set the current values
      addComponent('Text:', buttonEditor, 'kelmu-button-text', elemData.buttonText, 'text', true);
      addComponent('Font:', buttonEditor, 'kelmu-button-font', elemData.font, 'text');
      addComponent('Size:', buttonEditor, 'kelmu-button-size', elemData.size, 'text');
      addComponent('Angle:', buttonEditor, 'kelmu-button-rotate', elemData.rotate, 'text');
      addComponent('Action:', buttonEditor, 'kelmu-button-action', elemData.button, 'text');
      addComponent('Parameter:', buttonEditor, 'kelmu-button-parameter', elemData.parameter, 'text');

      // Move cursor to end
      buttonEditor.find('.kelmu-button-text').focus();
      var val = buttonEditor.find('.kelmu-button-text').val();
      buttonEditor.find('.kelmu-button-text').val('').val(val);

      var buttonContainer = $('<div></div>').appendTo(buttonEditor);

      // Save the modified properties
      var saveButton = function() {
        elemData.buttonText = buttonEditor.find('.kelmu-button-text').val() || '?';
        elemData.font = buttonEditor.find('.kelmu-button-font').val() || window.kelmu.defaults.button.font;
        elemData.size = buttonEditor.find('.kelmu-button-size').val() || window.kelmu.defaults.button.size;
        elemData.rotate = buttonEditor.find('.kelmu-button-rotate').val() || window.kelmu.defaults.button.rotate;
        elemData.button = buttonEditor.find('.kelmu-button-action').val() || 'show';
        elemData.parameter = buttonEditor.find('.kelmu-button-parameter').val();
        window.kelmu.data[id].actions.update();
        updateView(true, true);
        notifyModifications();
      };

      buttonEditor.find('input').keyup(saveButton);

      createRemoveButton().appendTo(buttonContainer);

      // Set current properties as default settings
      $('<button></button>').text('Make default').addClass('btn').appendTo(buttonContainer).click(function(e) {
        e.preventDefault();
        window.kelmu.defaults.button.font = buttonEditor.find('.kelmu-button-font').val() || buttonDefaults.font;
        window.kelmu.defaults.button.size = buttonEditor.find('.kelmu-button-size').val() || buttonDefaults.size;
        window.kelmu.defaults.button.rotate = buttonEditor.find('.kelmu-button-rotate').val() || buttonDefaults.rotate;
      });

    };


    /**
     * Creates the action editor pane for the selected event.
     */
    var createActionEditor = function() {

      var data = window.kelmu.data[id];
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      editor.find('.kelmu-editor-pane').remove();

      var actionEditor = $('<div></div>').addClass('kelmu-action-editor').addClass('kelmu-editor-pane');
      actionEditor.appendTo(editor);

      actionEditor.append($('<h4>Action</h4>').css('margin', '15px 0px'));

      idCounter += 1;

      // Set the current values
      addComponent('Action:', actionEditor, 'kelmu-action-type', elemData.action, 'text', true);
      addComponent('Parameter:', actionEditor, 'kelmu-action-parameter', elemData.parameter, 'text');
      addComponent('State:', actionEditor, 'kelmu-action-when', elemData.when, 'text');

      // Move cursor to end
      actionEditor.find('.kelmu-action-type').focus();
      var val = actionEditor.find('.kelmu-action-type').val();
      actionEditor.find('.kelmu-action-type').val('').val(val);

      var buttonContainer = $('<div></div>').appendTo(actionEditor);

      // Save the modified properties
      var saveButton = function() {
        elemData.action = actionEditor.find('.kelmu-action-type').val() || window.kelmu.defaults.action.action;
        elemData.parameter = actionEditor.find('.kelmu-action-parameter').val() || window.kelmu.defaults.action.parameter;
        elemData.when = actionEditor.find('.kelmu-action-when').val() || window.kelmu.defaults.action.when;
        window.kelmu.data[id].actions.update();
        updateView(true, true);
        notifyModifications();
      };

      actionEditor.find('input').keyup(saveButton);

      createRemoveButton().appendTo(buttonContainer);

      // Set current properties as default settings
      $('<button></button>').text('Make default').addClass('btn').appendTo(buttonContainer).click(function(e) {
        e.preventDefault();
        window.kelmu.defaults.action.action = actionEditor.find('.kelmu-action-type').val() || actionDefaults.action;
        window.kelmu.defaults.action.parameter = actionEditor.find('.kelmu-action-parameter').val() || actionDefaults.parameter;
        window.kelmu.defaults.action.when = actionEditor.find('.kelmu-action-when').val() || actionDefaults.when;
      });

    };


    /**
     * Creates the action editor pane for the selected arrow.
     */
    var createArrowEditor = function() {

      var data = window.kelmu.data[id];
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      editor.find('.kelmu-editor-pane').remove();

      var arrowEditor = $('<div></div>').addClass('kelmu-arrow-editorr').addClass('kelmu-editor-pane');
      arrowEditor.appendTo(editor);

      arrowEditor.append($('<h4>Arrow</h4>').css('margin', '15px 0px'));

      idCounter += 1;

      // Set the current values
      addComponent('Size:', arrowEditor, 'kelmu-arrow-size', elemData.size, 'text', true);
      addComponent('Width:', arrowEditor, 'kelmu-arrow-width', elemData.width, 'text');
      addComponent('Color:', arrowEditor, 'kelmu-arrow-color', elemData.arrow, 'text');
      addComponent('With sound:', arrowEditor, 'kelmu-arrow-sound-option', elemData.soundOption, 'text');

      // Save the modified properties
      var saveArrow = function() {
        elemData.size = arrowEditor.find('.kelmu-arrow-size').val() || window.kelmu.defaults.arrow.size;
        elemData.width = arrowEditor.find('.kelmu-arrow-width').val() || window.kelmu.defaults.arrow.width;
        elemData.arrow = arrowEditor.find('.kelmu-arrow-color').val() || window.kelmu.defaults.arrow.arrow;
        elemData.soundOption = arrowEditor.find('.kelmu-arrow-sound-option').val() || window.kelmu.defaults.arrow.soundOption;
        window.kelmu.data[id].actions.update();
        updateView(true, true);
        notifyModifications();
      };

      arrowEditor.find('input').keyup(saveArrow);

      var buttonContainer = $('<div></div>').appendTo(arrowEditor);

      createRemoveButton().appendTo(buttonContainer);

      // Save the modified properties
      $('<button></button>').text('Make default').addClass('btn').appendTo(buttonContainer).click(function(e) {
        e.preventDefault();
        window.kelmu.defaults.arrow.width = arrowEditor.find('.kelmu-arrow-width').val() || arrowDefaults.width;
        window.kelmu.defaults.arrow.arrow = arrowEditor.find('.kelmu-arrow-color').val() || arrowDefaults.arrow;
        window.kelmu.defaults.arrow.size = arrowEditor.find('.kelmu-arrow-size').val() || arrowDefaults.size;
        window.kelmu.defaults.arrow.soundOption = arrowEditor.find('.kelmu-arrow-sound-option').val() || arrowDefaults.soundOption;
      });

    };


    /**
     * Creates the action editor pane for the selected line.
     */
    var createLineEditor = function() {

      var data = window.kelmu.data[id];
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      editor.find('.kelmu-editor-pane').remove();

      var lineEditor = $('<div></div>').addClass('kelmu-line-editor').addClass('kelmu-editor-pane');
      lineEditor.appendTo(editor);

      lineEditor.append($('<h4>Line</h4>').css('margin', '15px 0px'));

      idCounter += 1;

      // Set the current values
      addComponent('Width:', lineEditor, 'kelmu-line-width', elemData.width, 'text', true);
      addComponent('Color:', lineEditor, 'kelmu-line-color', elemData.line, 'text');
      addComponent('With sound:', lineEditor, 'kelmu-line-sound-option', elemData.soundOption, 'text');

      // Save the modified properties
      var saveLine = function() {
        elemData.width = lineEditor.find('.kelmu-line-width').val() || window.kelmu.defaults.line.width;
        elemData.line = lineEditor.find('.kelmu-line-color').val() || window.kelmu.defaults.line.line;
        elemData.soundOption = lineEditor.find('.kelmu-line-sound-option').val() || window.kelmu.defaults.line.soundOption;
        window.kelmu.data[id].actions.update();
        updateView(true, true);
        notifyModifications();
      };

      lineEditor.find('input').keyup(saveLine);

      var buttonContainer = $('<div></div>').appendTo(lineEditor);

      createRemoveButton().appendTo(buttonContainer);

      // Save the modified properties
      $('<button></button>').text('Make default').addClass('btn').appendTo(buttonContainer).click(function(e) {
        e.preventDefault();
        window.kelmu.defaults.line.width = lineEditor.find('.kelmu-line-width').val() || lineDefaults.width;
        window.kelmu.defaults.line.line = lineEditor.find('.kelmu-line-color').val() || lineDefaults.line;
        window.kelmu.defaults.line.soundOption = lineEditor.find('.kelmu-line-sound-option').val() || lineDefaults.soundOption;
      });

    };


    /**
     * Creates the action editor pane for the selected sound.
     */
    var createSoundEditor = function() {

      var data = window.kelmu.data[id];
      var elemData = data.definitions['step' + data.stepNumber][data.subStepNumber][data.selectedElementNumber];

      editor.find('.kelmu-editor-pane').remove();

      var soundEditor = $('<div></div>').addClass('kelmu-sound-editor').addClass('kelmu-editor-pane');
      soundEditor.appendTo(editor);

      soundEditor.append($('<h4>Sound</h4>').css('margin', '15px 0px'));

      idCounter += 1;

      // Set the current values
      addComponent('URL:', soundEditor, 'kelmu-sound-url', elemData.sound, 'text', true);

      // Move cursor to end
      soundEditor.find('.kelmu-sound-url').focus();
      var val = soundEditor.find('.kelmu-sound-url').val();
      soundEditor.find('.kelmu-sound-url').val('').val(val);

      var buttonContainer = $('<div></div>').appendTo(soundEditor);

      // Save the modified properties
      var saveButton = function() {
        elemData.sound = soundEditor.find('.kelmu-sound-url').val();
        window.kelmu.data[id].actions.update();
        updateView(true, true);
        notifyModifications();
      };

      soundEditor.find('input').keyup(saveButton);

      createRemoveButton().click(function(e) {
        e.preventDefault();

        var soundControl = container.find('.kelmu-sound-control');
        soundControl.hide();

        // If there are sounds for this animation, show the mute control
        Object.keys(window.kelmu.data[id].definitions || {}).forEach(function(substeps) {
          window.kelmu.data[id].definitions[substeps].forEach(function(substep) {
            substep.forEach(function(step) {
              if (step.sound !== undefined) {
                soundControl.show();
              }
            });
          });
        });

      }).appendTo(buttonContainer);

      // Play the sound
      $('<button></button>').text('Play').addClass('btn').appendTo(buttonContainer).click(function(e) {
        e.preventDefault();
        var sound = $('<audio></audio>').attr('src', soundEditor.find('.kelmu-sound-url').val());
        container.append(sound);
        sound[0].play();
      });

    };

    // Allow moving the sound control to switch the sounds on or off
    container.find('.kelmu-sound-control').css('cursor', 'move').draggable({
      stop: function() {
        var elem = $(this);
        window.kelmu.data[id].settings.soundX = parseInt(elem.css('top'), 10);
        window.kelmu.data[id].settings.soundY = parseInt(elem.css('left'), 10);
        notifyModifications();
      }
    });

    // Changing the sound setting will be the default for this animation
    container.find('kelmu-sound-control input').change(function() {
      window.kelmu.data[id].settings.soundEnabled = $(this).prop('checked');
      notifyModifications();
    });

    // A callback to refresh the editor if the current state changes outside of the editor
    window.kelmu.data[id].actions.updateEditor = function(force, noDelay) {
      window.kelmu.data[id].selectedElementNumber = -1;
      updateView(force, noDelay);
    };


    // ********************************************************************************************

    var editor = initUI();
    window.kelmu.data[id].actions.update();
    updateView(true, true);

  };

})(jQuery);
