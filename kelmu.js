/**
 * Kelmu - annotation library for JavaScript-based animations.
 * Licensed under MIT license.
 * @author: Teemu Sirkiä, Aalto University (teemu.sirkia@aalto.fi)
 */

(function($) {

  // Initialize the namespace
  window.kelmu = window.kelmu || {};
  window.kelmu.data = window.kelmu.data || {};
  window.kelmu.callbacks = window.kelmu.callbacks || {};

  $(function() {

    'use strict';

    /**
     * Registers a communication callback for a specific animation.
     */
    window.kelmu.registerCallback = function(id, cb) {
      if (window.kelmu.callbacks[id]) {
        window.kelmu.callbacks[id].push(cb);
      } else {
        window.kelmu.callbacks[id] = [cb];
      }
    };


    /**
     * Sends a message to all recipients that are registered to receive events
     * with the given animation id.
     */
    window.kelmu.sendMessage = function(id, action, parameter, payload) {
      $.each(window.kelmu.callbacks[id], function() {
        this(action, parameter, payload);
      });
    };


    /**
     * Initializes the annotation layer for the given element by using the
     * given animation id.
     */
    window.kelmu.initAnnotations = function(element, id) {

      element = $(element);

      // Prevent initializing the same animation twice
      if (element.parents('.kelmu-container').length > 0) {
        return;
      }

      // Set empty default values if settings or definitions are not available
      window.kelmu.data[id] = window.kelmu.data[id] || {};
      window.kelmu.data[id].settings = window.kelmu.data[id].settings || {};
      window.kelmu.data[id].definitions = window.kelmu.data[id].definitions || {};

      var container = $('<div></div>').addClass('kelmu-container').css('position', 'relative').css('clear', 'both').attr('data-kelmu-id', id);
      var annotationsDiv = $('<div></div>').addClass('annotations').css('position', 'absolute').css('z-index', '50000');

      element.wrap(container);
      container = element.parent();
      annotationsDiv.prependTo(container);

      window.kelmu.data[id].stepNumber = 0;
      window.kelmu.data[id].subStepNumber = 0;
      window.kelmu.data[id].undoStack = [[0, 0]];
      window.kelmu.data[id].undoStackPointer = 0;
      window.kelmu.data[id].animationReadyAvailable = false;
      window.kelmu.data[id].stepsToRun = 0;
      window.kelmu.data[id].stepsEvent = null;


      window.kelmu.data[id].settings.animationLength = window.kelmu.data[id].settings.animationLength || 350; // default value which can be changed by sending animationLength message

      var clearAnnotations = function() {
        annotationsDiv.children().remove();
        container.find('.kelmu-arrow-handle').remove();
        container.children('svg').first().remove();
        container.find('audio.kelmu-annotation-sound').each(function() {
          try {
            this.pause();
          } catch (err) {
            // Ignore if stopping sounds raised any errors
          }
        });
      };

      var originalStep = null;
      var originalRedo = null;
      var originalUndo = null;
      var originalBegin = null;

      /**
       * Functionality for step button.
       */
      var forward = function(event) {

        event.preventDefault();

        if ((window.kelmu.data[id].definitions['step' + window.kelmu.data[id].stepNumber] || [null]).length - 1 === window.kelmu.data[id].subStepNumber) {

          // Move to next step
          clearAnnotations();
          window.kelmu.data[id].stepNumber += 1;
          window.kelmu.data[id].subStepNumber = 0;
          if (window.kelmu.data[id].actions.updateEditor) {
            window.kelmu.data[id].actions.updateEditor(true, true);
          }
          originalStep(event);

          // If the animator is not able to report when the animation is ready,
          // create the annotations for the next step after a delay
          if (!window.kelmu.data[id].animationReadyAvailable) {
            setTimeout(function() {
              if (window.kelmu.data[id].stepsToRun === 0) {
                // Add the current state to the undo stack if there are no more steps to run
                window.kelmu.data[id].undoStack.splice(window.kelmu.data[id].undoStackPointer + 1, window.kelmu.data[id].undoStack.length);
                window.kelmu.data[id].undoStack.push([window.kelmu.data[id].stepNumber, window.kelmu.data[id].subStepNumber]);
                window.kelmu.data[id].undoStackPointer += 1;
              }
              createAnnotations();
              if (window.kelmu.data[id].actions.updateEditor) {
                window.kelmu.data[id].actions.updateEditor(true, true);
              }
            }, window.kelmu.data[id].settings.animationLength);
          }
        } else {

          // Move to next substep
          window.kelmu.data[id].subStepNumber += 1;
          window.kelmu.data[id].actions.setSubstep(window.kelmu.data[id].subStepNumber);
          if (window.kelmu.data[id].actions.updateEditor) {
            window.kelmu.data[id].actions.updateEditor(true, true);
          }

          // Add the current state to the undo stack if there are no more steps to run
          window.kelmu.data[id].undoStack.splice(window.kelmu.data[id].undoStackPointer + 1, window.kelmu.data[id].undoStack.length);
          window.kelmu.data[id].undoStack.push([window.kelmu.data[id].stepNumber, window.kelmu.data[id].subStepNumber]);
          window.kelmu.data[id].undoStackPointer += 1;
        }

      };

      /**
       * Functionality for redo button.
       */
      var redo = function(event) {

        event.preventDefault();

        if (window.kelmu.data[id].undoStackPointer < window.kelmu.data[id].undoStack.length - 1) {

          var sp = window.kelmu.data[id].undoStackPointer;
          if (window.kelmu.data[id].undoStack[sp + 1][0] !== window.kelmu.data[id].stepNumber) {
            originalRedo(event);
          }

          window.kelmu.data[id].undoStackPointer += 1;
          sp = window.kelmu.data[id].undoStackPointer;
          window.kelmu.data[id].stepNumber = window.kelmu.data[id].undoStack[sp][0];
          window.kelmu.data[id].subStepNumber = window.kelmu.data[id].undoStack[sp][1];

          createAnnotations();
          if (window.kelmu.data[id].actions.updateEditor) {
            window.kelmu.data[id].actions.updateEditor(true, true);
          }

        }

      };

      /**
       * Functionality for undo button.
       */
      var undo = function(event) {

        event.preventDefault();

        if (window.kelmu.data[id].undoStackPointer > 0) {

          var sp = window.kelmu.data[id].undoStackPointer;
          if (window.kelmu.data[id].undoStack[sp - 1][0] !== window.kelmu.data[id].stepNumber) {
            originalUndo(event);
          }

          window.kelmu.data[id].undoStackPointer -= 1;
          sp = window.kelmu.data[id].undoStackPointer;
          window.kelmu.data[id].stepNumber = window.kelmu.data[id].undoStack[sp][0];
          window.kelmu.data[id].subStepNumber = window.kelmu.data[id].undoStack[sp][1];

          createAnnotations();
          if (window.kelmu.data[id].actions.updateEditor) {
            window.kelmu.data[id].actions.updateEditor(true, true);
          }

        }

      };

      /**
       * Functionality for begin button.
       */
      var begin = function(event) {

        event.preventDefault();

        if (window.kelmu.data[id].undoStack[0][0] !== window.kelmu.data[id].stepNumber) {
          originalBegin(event);
        }

        window.kelmu.data[id].undoStackPointer = 0;
        window.kelmu.data[id].stepNumber = 0;
        window.kelmu.data[id].subStepNumber = 0;

        createAnnotations();
        if (window.kelmu.data[id].actions.updateEditor) {
          window.kelmu.data[id].actions.updateEditor(true, true);
        }

      };

      /**
       * Functionality for the `show` action.
       */
      var handleShow = function(event, showAction) {
        var data = window.kelmu.data[id];
        var count = Math.max(+showAction.parameter || 1, 1);

        var action = function() {
          forward(event);
        };

        if (!data.animationReadyAvailable) {
          for (var i = 0; i < count; i++) {
            setTimeout(action, i * (data.settings.animationLength + 300));
          }
        } else {
          data.stepEvent = event;
          data.stepsToRun = count - 1;

          if (data.stepsToRun > 0) {
            // Notify the animator that we are running multiple steps that should be combined into a single step
            window.kelmu.sendMessage(id, 'showSequence');
          }

          forward(event);
        }
      };

      var forwardAndSkip = function(event) {
        var found = false;
        var data = window.kelmu.data[id];
        if (data.definitions['step' + data.stepNumber]) {
          $.each(data.definitions['step' + data.stepNumber][data.subStepNumber], function() {
            if (this.action && this.action === 'skip' && this.when === 'step') {
              found = true;
              handleSkip(event, this);
            } else if (this.action && this.action === 'show' && this.when === 'step') {
              found = true;
              handleShow(event, this);
            }
          });
        }

        if (!found) {
          forward(event);
        }

      };

      var stepButtonInitialized = false;
      var beginButtonInitialized = false;
      var undoButtonInitialized = false;
      var redoButtonInitialized = false;

      /**
       * Initializes the buttons and sets proxies to take over the original click handlers.
       */
      var initButtons = function() {

        var events;
        var button;

        if (window.kelmu.data[id].settings.step && !stepButtonInitialized) {
          button = element.find(window.kelmu.data[id].settings.step);
          if (button.length > 0) {
            events = $._data(button[0], 'events');
            stepButtonInitialized = true;

            if (events && events.click && events.click.length > 0) {
              originalStep = events.click[0].handler;
              events.click[0].handler = forwardAndSkip;
            } else {
              button.click(forwardAndSkip);
            }
          }
        }

        if (window.kelmu.data[id].settings.redo && !redoButtonInitialized) {
          button = element.find(window.kelmu.data[id].settings.redo);
          if (button.length > 0) {
            events = $._data(button[0], 'events');
            redoButtonInitialized = true;

            if (events && events.click && events.click.length > 0) {
              originalRedo = events.click[0].handler;
              events.click[0].handler = redo;
            } else {
              button.click(redo);
            }
          }
        }

        if (window.kelmu.data[id].settings.undo && !undoButtonInitialized) {
          button = element.find(window.kelmu.data[id].settings.undo);
          if (button.length > 0) {
            events = $._data(button[0], 'events');
            undoButtonInitialized = true;

            if (events && events.click && events.click.length > 0) {
              originalUndo = events.click[0].handler;
              events.click[0].handler = undo;
            } else {
              button.click(undo);
            }
          }
        }

        if (window.kelmu.data[id].settings.begin && !beginButtonInitialized) {
          button = element.find(window.kelmu.data[id].settings.begin);
          if (button.length > 0) {
            events = $._data(button[0], 'events');
            beginButtonInitialized = true;

            if (events && events.click && events.click.length > 0) {
              originalBegin = events.click[0].handler;
              events.click[0].handler = begin;
            } else {
              button.click(begin);
            }
          }
        }

      };

      /**
       * Functionality for the `skip` action.
       */
      var handleSkip = function(event, action) {
        var data = window.kelmu.data[id];
        var stepsLeft = Math.max(+(action.parameter || 1), 1);
        var stepsToRun = 0;

        var proceed = function() {
          this('skip', stepsToRun);
        };

        while (stepsLeft > 0) {

          var subSteps = (data.definitions['step' + data.stepNumber] || [null]).length - 1;
          var currentSub = data.subStepNumber;
          var canIncrease = subSteps - currentSub;

          if (canIncrease < stepsLeft) {

            data.stepNumber += 1;
            data.subStepNumber = 0;
            stepsToRun += 1;
            stepsLeft -= canIncrease + 1;

          } else if (canIncrease > 0) {

            if (stepsToRun > 0) {
              $.each(window.kelmu.callbacks[id], proceed);
              stepsToRun = 0;
              clearAnnotations();
              originalStep(event);
            }

            stepsLeft -= canIncrease;
            data.subStepNumber = data.subStepNumber + canIncrease;
          } else {
            data.stepNumber += 1;
            stepsToRun += 1;
            stepsLeft -= 1;
          }

        }

        if (stepsToRun > 0) {
          $.each(window.kelmu.callbacks[id], proceed);
          stepsToRun = 0;
          clearAnnotations();
          originalStep(event);

          if (!window.kelmu.data[id].animationReadyAvailable) {
            setTimeout(function() {
              createAnnotations();
              if (window.kelmu.data[id].actions.updateEditor) {
                window.kelmu.data[id].actions.updateEditor();
              }
            }, window.kelmu.data[id].settings.animationLength);
          }

        } else {
          createAnnotations();
        }

        window.kelmu.data[id].undoStack.splice(window.kelmu.data[id].undoStackPointer + 1, window.kelmu.data[id].undoStack.length);
        window.kelmu.data[id].undoStack.push([window.kelmu.data[id].stepNumber, window.kelmu.data[id].subStepNumber]);
        window.kelmu.data[id].undoStackPointer += 1;

      };

      /**
       * Creates annotations for the current (sub)step.
       */
      var createAnnotations = function() {

        var data = window.kelmu.data[id];

        clearAnnotations();

        // Enable undo and redo in the first step if there are substeps
        if (data.stepNumber === 0 && data.subStepNumber > 0 && data.undoStack.length > 1) {
          element.find(window.kelmu.data[id].settings.undo).prop('disabled', false);
          element.find(window.kelmu.data[id].settings.begin).prop('disabled', false);
        }

        if (data.stepNumber === 0 && data.subStepNumber === 0) {
          element.find(window.kelmu.data[id].settings.undo).prop('disabled', true);
          element.find(window.kelmu.data[id].settings.begin).prop('disabled', true);
        }

        if (data.stepNumber === 0 && data.undoStack.length > 1 && data.undoPointer !== data.undoStack.length - 1) {
          element.find(window.kelmu.data[id].settings.redo).prop('disabled', false);
        }

        if (data.stepNumber === 0 && data.undoStack.length === 1) {
          element.find(window.kelmu.data[id].settings.redo).prop('disabled', true);
        }

        if (data.definitions['step' + data.stepNumber]) {

          if (data.stepNumber === data.lastStep && data.subStepNumber < data.definitions['step' + data.stepNumber].length - 1) {
            // Allow showing substeps in the final step
            element.find(window.kelmu.data[id].settings.step).prop('disabled', false);

            // Notify the animator that there will be still substeps to be shown
            window.kelmu.sendMessage(id, 'postponeEnd');
          } else if (data.stepNumber === data.lastStep && data.subStepNumber === data.definitions['step' + data.stepNumber].length - 1) {
            element.find(window.kelmu.data[id].settings.step).prop('disabled', true);
            // Notify the animator that the last substep is now shown
            window.kelmu.sendMessage(id, 'lastSubstepShown');
          }

          var svg = null;
          var arrowCounter = 0;

          // Iterate all the annotations assigned to this step/substep
          $.each(data.definitions['step' + data.stepNumber][data.subStepNumber], function(index) {

            // Ignore annotations that should not be shown with the current sound setting
            var soundEnabled = window.kelmu.data[id].settings.soundEnabled === true;
            if (!data.editorMode && soundEnabled && this.soundOption === 'off') {
              return;
            } else if (!data.editorMode && !soundEnabled && this.soundOption === 'on') {
              return;
            }

            if (this.text) {

              var annotation = $('<div></div>').addClass('kelmu-annotation');
              annotation.attr('data-annotation', index);

              if (this.html) {
                $('<div></div>').addClass('kelmu-annotation-content').html(this.text).appendTo(annotation);
              } else {
                $('<div></div>').addClass('kelmu-annotation-content').text(this.text).appendTo(annotation);
              }

              annotation.css('position', 'absolute');
              annotation.css('top', this.top + 'px');
              annotation.css('left', this.left + 'px');
              annotation.css('width', this.width + 'px');
              annotation.css('height', this.height + 'px');
              annotation.css('color', this.color);
              annotation.css('background-color', this.background);
              annotation.css('font-family', this.font);
              annotation.css('font-size', this.size + 'px');
              annotation.css('border-radius', '4px');
              annotation.css('padding', '10px');
              annotation.css('z-index', '50001');

              if (!data.editorMode) {
                // Text annotations should not accidentally capture any mouse events
                annotation.css('pointer-events', 'none');
              }

              if (this.rotate !== 0) {
                annotation.css('transform', 'rotate(' + this.rotate + 'deg)');
                annotation.css('moz-transform', 'rotate(' + this.rotate + 'deg)');
                annotation.css('webkit-transform', 'rotate(' + this.rotate + 'deg)');
                annotation.css('ms-transform', 'rotate(' + this.rotate + 'deg)');

                annotation.css('transform-origin', 'left top');
                annotation.css('moz-transform-origin', 'left top');
                annotation.css('webkit-transform-origin', 'left top');
                annotation.css('ms-transform-origin', 'left top');
              }

              if (this.background !== 'transparent' && this.shadow) {
                //TODO: editor
                annotation.css('box-shadow', '3px 3px 5px #888888');
              }

              annotationsDiv.append(annotation);

            } else if (this.button) {

              var button = $('<a></a>').addClass('kelmu-button');
              button.attr('data-annotation', index);
              button.text(this.buttonText).appendTo(annotationsDiv);

              button.css('position', 'absolute');
              button.css('top', this.top + 'px');
              button.css('left', this.left + 'px');
              button.css('font-family', this.font);
              button.css('font-size', this.size + 'px');
              button.css('white-space', 'nowrap');
              button.css('cursor', 'pointer');
              button.css('z-index', '50002');

              if (this.rotate !== 0) {
                button.css('transform', 'rotate(' + this.rotate + 'deg)');
                button.css('moz-transform', 'rotate(' + this.rotate + 'deg)');
                button.css('webkit-transform', 'rotate(' + this.rotate + 'deg)');
                button.css('ms-transform', 'rotate(' + this.rotate + 'deg)');

                button.css('transform-origin', 'left top');
                button.css('moz-transform-origin', 'left top');
                button.css('webkit-transform-origin', 'left top');
                button.css('ms-transform-origin', 'left top');
              }

              var self = this;
              button.click(function(event) {
                if (!data.editorMode || event.ctrlKey) {
                  if (self.button === 'show') {
                    handleShow(event, self);
                  } else if (self.button === 'skip') {
                    handleSkip(event, self);
                  } else {
                    $.each(window.kelmu.callbacks[id], function() {
                      this(self.button, self.parameter);
                    });
                  }
                }
              });

              annotationsDiv.append(button);

            } else if (this.arrow || this.line) {

              if (svg === null) {
                var areaWidth = container.width();
                var areaHeight = container.height();
                svg = $('<svg class="annotation-svg-container" pointer-events="none" style="z-index: 51000; position: absolute; top: 0; left: 0;" width="' + areaWidth + '" height="' + areaHeight + '"><defs></defs></svg>');
                svg.prependTo(container);
              }

              if (this.arrow) {
                var arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                arrowMarker.setAttribute('id', id + '-arrow-marker-' + arrowCounter);
                arrowMarker.setAttribute('viewBox', '0 0 10 10');
                arrowMarker.setAttribute('refX', '10');
                arrowMarker.setAttribute('refY', '5');
                arrowMarker.setAttribute('markerUnits', 'strokeWidth');
                arrowMarker.setAttribute('markerWidth', this.size);
                arrowMarker.setAttribute('markerHeight', this.size);
                arrowMarker.setAttribute('orient', 'auto');

                var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
                path.setAttribute('fill', this.arrow);
                path.setAttribute('stroke', this.arrow);

                svg.children('defs').append(arrowMarker);
                $(arrowMarker).append(path);
              }

              var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              var d = 'M ' + this.x1 + ' ' + this.y1 + ' L ' + this.x2 + ' ' + this.y2;
              arrow.setAttribute('id', 'arrow-' + arrowCounter);
              arrow.setAttribute('d', d);
              arrow.setAttribute('fill', 'none');
              arrow.setAttribute('stroke', this.arrow || this.line);
              arrow.setAttribute('stroke-width', this.width);
              if (this.arrow) {
                arrow.setAttribute('marker-end', 'url(#' + id + '-arrow-marker-' + (arrowCounter) + ')');
              }
              arrowCounter += 1;
              svg.append(arrow);
            } else if (this.action) {

              if (this.when === 'enter' && !data.editorMode) {
                var actionData = this;
                $.each(window.kelmu.callbacks[id], function() {
                  this(actionData.action, actionData.parameter);
                });
              }

            } else if (this.sound && !data.editorMode && window.kelmu.data[id].settings.soundEnabled) {
              var sound = $('<audio></audio>').attr('src', this.sound).addClass('kelmu-annotation-sound');
              container.append(sound);
              try {
                sound[0].play();
              } catch (err) {

              }
            }
          });

        }

      };

      var soundControl = $('<div></div>').addClass('kelmu-sound-control').prependTo(container).hide();
      var soundOnOff = $('<input type="checkbox"></input>');
      soundControl.append(soundOnOff);
      soundControl.css('left', window.kelmu.data[id].settings.soundX || 1);
      soundControl.css('top', window.kelmu.data[id].settings.soundY || 1);
      if (window.kelmu.data[id].settings.soundEnabled) {
        soundOnOff.prop('checked', true);
      }
      soundOnOff.change(function() {
        window.kelmu.data[id].settings.soundEnabled = $(this).prop('checked');
      });

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

      window.kelmu.registerCallback(id, function(action, parameter, payload) {
        if (action === 'animationCapabilities') {
          // Response to the capabilities request

          if (payload.indexOf('animationReady') > -1) {
            // The animator supports sending an event after each animation
            window.kelmu.data[id].animationReadyAvailable = true;
          }

        } else if (action === 'animationReady') {
          // Animator reported that the current animation has ended

          // Is there a sequence of steps to be run?
          if (window.kelmu.data[id].stepsToRun === 0) {
            window.kelmu.data[id].stepEvent = null;

            // Add the current state to the undo stack if there are no more steps to run
            window.kelmu.data[id].undoStack.splice(window.kelmu.data[id].undoStackPointer + 1, window.kelmu.data[id].undoStack.length);
            window.kelmu.data[id].undoStack.push([window.kelmu.data[id].stepNumber, window.kelmu.data[id].subStepNumber]);
            window.kelmu.data[id].undoStackPointer += 1;

            createAnnotations();
            if (window.kelmu.data[id].actions.updateEditor) {
              window.kelmu.data[id].actions.updateEditor(true, true);
            }
          } else {
            window.kelmu.data[id].stepsToRun -= 1;

            if (window.kelmu.data[id].stepsToRun > 0) {
              // Notify the animator that we are running multiple steps that should be combined into a single step
              window.kelmu.sendMessage(id, 'showSequence');
            }

            element.find(window.kelmu.data[id].settings.undo).prop('disabled', true);
            element.find(window.kelmu.data[id].settings.begin).prop('disabled', true);
            element.find(window.kelmu.data[id].settings.redo).prop('disabled', true);
            element.find(window.kelmu.data[id].settings.step).prop('disabled', true);

            // A short pause between the steps
            setTimeout(function() {
              forward(window.kelmu.data[id].stepEvent);
            }, 300);

          }

        } else if (action === 'animationEnded') {
          window.kelmu.data[id].lastStep = window.kelmu.data[id].stepNumber;
        } else if (action === 'animationLength') {
          window.kelmu.data[id].settings.animationLength = parseInt(parameter, 10) + 50;
        } else if (action === 'buttonDefinitions') {
          window.kelmu.data[id].settings = $.extend(window.kelmu.data[id].settings, payload);
          initButtons();
        } else if (action === 'currentStep' && parameter) {

          var origStepNumber = window.kelmu.data[id].stepNumber;

          window.kelmu.data[id].subStepNumber = 0;
          window.kelmu.data[id].actions.setStep(parseInt(parameter, 10));

          if (parseInt(parameter, 10) !== origStepNumber) {
            window.kelmu.data[id].undoStack.splice(window.kelmu.data[id].undoStackPointer + 1, window.kelmu.data[id].undoStack.length);
            window.kelmu.data[id].undoStack.push([window.kelmu.data[id].stepNumber, window.kelmu.data[id].subStepNumber]);
            window.kelmu.data[id].undoStackPointer += 1;
          }

          if (window.kelmu.data[id].actions.updateEditor) {
            window.kelmu.data[id].actions.updateEditor(true, true);
          }
        }

      });

      if (window.kelmu.createEditor) {
        var editorLinkContainer = $('<div></div>');
        container.after(editorLinkContainer);
        var editorLink = $('<a href="#" class="kelmu-editor-link">Annotation editor</a>');
        editorLink.appendTo(editorLinkContainer);
        editorLink.click(function(e) {
          e.preventDefault();
          window.kelmu.data[id].editorMode = true;
          window.kelmu.createEditor(id, container);
          $(this).remove();

          var editorToggleLink = $('<a href="#" class="kelmu-editor-link">Show/hide editor</a>');
          editorToggleLink.appendTo(editorLinkContainer);
          editorToggleLink.click(function(e) {
            e.preventDefault();
            if (window.kelmu.data[id].editorMode) {
              window.kelmu.data[id].editorMode = false;
              window.kelmu.data[id].actions.update();
              container.find('.kelmu-editor').hide();
            } else {
              window.kelmu.data[id].editorMode = true;
              window.kelmu.data[id].actions.update();
              window.kelmu.data[id].actions.updateEditor(true, true);
              container.find('.kelmu-editor').show();
            }
          });

        });
      }

      // ********************************************************************************************

      // Export some functions
      window.kelmu.data[id].actions = {
        update: createAnnotations,
        initButtons: initButtons,
        setStep: function(step) {
          window.kelmu.data[id].stepNumber = step;
          createAnnotations();
        },
        setSubstep: function(substep) {
          window.kelmu.data[id].subStepNumber = substep;
          createAnnotations();
        }
      };

      // ********************************************************************************************

      initButtons();
      createAnnotations();

      // Request the capabilities of the animator
      window.kelmu.sendMessage(id, 'getCapabilities');

      // Request the length of an animation step (ms)
      window.kelmu.sendMessage(id, 'getAnimationLength');

      // Request button definitions
      window.kelmu.sendMessage(id, 'getButtonDefinitions');

      // Request the current step number
      window.kelmu.sendMessage(id, 'getCurrentStep');

    };

    // ********************************************************************************************

    /**
     * Initializes all animations that have the CSS class `kelmu` and the attribute
     * `data-kelmu-definition` for the URL.
     */
    window.kelmu.initAll = function() {

      var jsonpSettings = {
        dataType: 'jsonp',
        jsonp: false,
        jsonpCallback: 'kelmuCb'
      };

      var jsonSettings = {
        dataType: 'json'
      };

      $('.kelmu').each(function() {
        var self = this;

        if (!$(this).attr('data-kelmu-id')) {
          return;
        }

        var kelmuId = $(this).attr('data-kelmu-id');
        var definitionURL = $(this).attr('data-kelmu-definition');
        if (definitionURL) {
          var isJSONP = definitionURL.indexOf('.jsonp') >= 0;
          $.ajax(definitionURL, isJSONP ? jsonpSettings : jsonSettings).done(function(data) {
            if (data[kelmuId]) {
              window.kelmu.data[kelmuId] = window.kelmu.data[kelmuId] || {};
              window.kelmu.data[kelmuId] = $.extend(window.kelmu.data[kelmuId], data[kelmuId]);
              window.kelmu.initAnnotations(self, kelmuId);
            }
          });
        } else {
          window.kelmu.initAnnotations(self, kelmuId);
        }
      });
    };

    // Postpone the initialization
    // TODO: how to do this better...
    setTimeout(window.kelmu.initAll, 200);

  });

}(jQuery));
