// Carousel
// Author: Nick Stark

(function(win) {
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // requestAnimationFrame polyfill by Erik Möller
    // fixes from Paul Irish and Tino Zijdel
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

(function($, win) {
    'use strict';

    /**
     * Constructor for carousel object
     *
     * @param {DOMElement} el Slide container
     */
    var Carousel = function(el, options) {
        this.$container = $(el);
        this.$el = this.$container.wrap('<div>').parent().addClass('carousel-wrap');
        this.$slides = this.$container.children();
        this.size = this.$slides.length;
        this.currentIndex = 0;
        this.settings = $.extend({
            speed: 400,
            pagination: false,
            controls: true,
            touch: true
        }, options);
        this.transitioning = false;
        this.pageX = 0;
        this.currentOffset = 0;

        this._setSize();
        this._detectSupport();
        if (this.settings.controls) {
            this._initControls();
        }
        if (this.settings.pagination) {
            this._initPagination();
        }
        this._update();
        this._bind();
        this.onWindowResize(); // get initial settings
    };

    /**
     * Initialize container size
     */
    Carousel.prototype._setSize = function() {
        this.$container.css('width', (this.size * 100) + '%');
        this.$slides.css('width', (100 / this.size) + '%');
    };

    /**
     * Detect CSS Transition support
     */
    Carousel.prototype._detectSupport = function() {
        var self = this;
        this.supportsTransition = (function() {
            var div = document.createElement('div');
            var style = div.style;
            var prop = 'Transition';

            return prop in style || 'Moz' + prop in style || 'Webkit' + prop in style;
        }());
        this.transitionEvent = 'transitionend webkitTransitionEnd';
    };

    /**
     * Add Prev/Next controls
     */
    Carousel.prototype._initControls = function() {
        var $controls = $('<div class="carousel-controls"></div>');
        $controls
            .append('<a href="#" class="carousel-control carousel-prev">Prev</a>')
            .append('<a href="#" class="carousel-control carousel-next">Next</a>');
        this.$controls = $controls.appendTo(this.$el);
    };

    /**
     * Add Pagination
     */
    Carousel.prototype._initPagination = function() {
        var $pagination = $('<ul class="carousel-pagination"></ul>');

        this.$slides.each(function(index, el) {
            $pagination.append('<li><a href="#">' + (index + 1) + '</a></li>');
        });

        this.$pagination = $pagination.appendTo(this.$el);
    };

    /**
     * Bind events to carousel
     */
    Carousel.prototype._bind = function() {
        var self = this;

        if (self.settings.controls) {
            self.$controls.on('click', '.carousel-control', function(e) {
                e.preventDefault();
                var $control = $(this);

                if ($control.hasClass('is-disabled')) {
                    return;
                }

                if ($control.hasClass('carousel-prev')) {
                    self.prev();
                } else {
                    self.next();
                }
            });
        }

        if (self.settings.pagination) {
            self.$pagination.on('click', 'a', function(e) {
                e.preventDefault();
                var index = $(this).parent().index();
                self.goToSlide(index);
            });
        }

        if (typeof TouchEvent !== "undefined") {
            self.$container.on('touchstart', $.proxy(self.onTouchStart, self));
            self.$container.on('touchmove', $.proxy(self.onTouchMove, self));
            self.$container.on('touchend touchcancel', $.proxy(self.onTouchEnd, self));
        }

        self.$el.on('keydown', $.proxy(self.onKeyPress, self));

        $(win).on('resize', $.proxy(self.onWindowResize, self));
    };

    /**
     * Updates
     *
     * @param {string} param Parameter Description
     * @returns {boolean}
     */
    Carousel.prototype._update = function() {
        var index = this.currentIndex;
        var controls;

        // update slides
        this.$slides.removeClass('is-current').eq(index).addClass('is-current');

        // update disabled state
        if (this.settings.controls) {
            controls = this.$controls.children().removeClass('is-disabled');
            if (index === 0) {
                controls.filter('.carousel-prev').addClass('is-disabled');
            } else if (index === this.size - 1) {
                controls.filter('.carousel-next').addClass('is-disabled');
            }
        }

        // update pagination
        if (this.settings.pagination) {
            this.$pagination.children().removeClass('is-current').eq(index).addClass('is-current');
        }
    };

    /**
     * Resize even handler
     *
     * @param {string} param Parameter Description
     * @returns {boolean}
     */
    Carousel.prototype.onWindowResize = function() {
        this.slideWidth = this.$el.width();
    };

    /**
     * Convert pixel length to percentage
     *
     * @param {int} px Pixel value to be converted
     * @returns {int}
     */
    Carousel.prototype._getPercentage = function(px) {
        return (px * 100 / this.slideWidth);
    };

    /**
     * Update slide position based on last known offset
     */
    Carousel.prototype.animationUpdate = function() {
        this.timer = win.requestAnimationFrame($.proxy(this.animationUpdate, this));
        this.$container[0].style.left = this.currentOffset + '%';
    };

    /**
     * Touch start handler
     *
     * @param {Event} event Touch event
     */
    Carousel.prototype.onTouchStart = function(event) {
        var touch;
        // only swipe for one finger
        if (event.originalEvent.touches.length === 1) {
            touch = event.originalEvent.touches[0];
            this.touchstartY = touch.pageY;
            this.touchstartX = touch.pageX;
            this.pageX = parseInt(this.$container.css('left'), 10) || 0;
            this.currentOffset = this._getPercentage(this.pageX);
            this.timer = win.requestAnimationFrame($.proxy(this.animationUpdate, this));
        }
    };

    /**
     * Touch move handler
     *
     * @param {Event} event Touch event
     */
    Carousel.prototype.onTouchMove = function(event) {
        var touch, dx, isScrolling;
        event.stopPropagation();
        if (event.originalEvent.touches.length === 1) {
            touch = event.originalEvent.touches[0];
            isScrolling = Math.abs(touch.pageX - this.touchstartX) < Math.abs(touch.pageY - this.touchstartY);
            if (!isScrolling) {
                event.preventDefault();
                dx = touch.pageX - this.touchstartX;
                this.currentOffset = this._getPercentage(this.pageX + dx);
            }
        }
    };

    /**
     * Touch end handler
     *
     * @param {Event} event Touch event
     */
    Carousel.prototype.onTouchEnd = function(event) {
        var touch, dx, pos;
        if (event.originalEvent.touches.length === 0) {
            win.cancelAnimationFrame(this.timer);
            touch = event.originalEvent.changedTouches[0];
            dx = touch.pageX - this.touchstartX;
            this.currentOffset = this._getPercentage(this.pageX + dx);
            pos = Math.round(this.currentOffset / -100);
            this.goToSlide(pos);
        }
    };

    /**
     * Keypress handler
     *
     * @param {Event} event Keydown event
     */
    Carousel.prototype.onKeyPress = function(event) {
        if (event.keyCode === 37 && this.currentIndex !== 0) {
            this.prev();
        } else if (event.keyCode === 39 && this.currentIndex !== this.size - 1) {
            this.next();
        }
    };

    /**
     * Clean up after animation ends
     *
     * @param {int} offset Offset at the end of animation
     * @param {int} index Index of slide that was animated to
     */
    Carousel.prototype.onAnimationComplete = function(offset, index) {
        this.currentOffset = offset;
        this.currentIndex = index;
        this.transitioning = false;
        this._update();

        if (this.supportsTransition) {
            this.$container
                .off(this.transitionEvent)
                .css({
                    '-webkit-transition-duration': '0s',
                    '-moz-transition-duration': '0s',
                    'transition-duration': '0s'
                });
        }
    };

    /**
     * Start transition to slide
     *
     * @param {int} index Slide to transition to
     */
    Carousel.prototype.goToSlide = function(index) {
        var self = this;

        if (index < 0) {
            index = 0;
        } else if (index >= self.size) {
            index = self.size - 1;
        }

        var offset = (index * -100);
        var diff = Math.abs(offset - self.currentOffset) / 100;
        var endState = {
            'left': offset + '%'
        };
        var transitionSpeed = (self.settings.speed * diff) + 'ms';

        if (self.transitioning) {
            return;
        }

        self.transitioning = true;

        if (self.supportsTransition) {
            if (offset === self.currentOffset) {
                self.onAnimationComplete(offset, index);
            }
            self.$container
                .css({
                    '-webkit-transition-duration': transitionSpeed,
                    '-moz-transition-duration': transitionSpeed,
                    'transition-duration': transitionSpeed
                })
                .on(self.transitionEvent, function(e) {
                    self.onAnimationComplete.call(self, offset, index);
                })
                .css(endState);

        } else {
            self.$container.animate(
                endState,
                self.settings.speed * diff,
                function() {
                    self.onAnimationComplete.call(self, offset, index);
                }
            );
        }
    };

    /**
     * Transition to the previous slide
     */
    Carousel.prototype.prev = function() {
        var prevIndex = (this.size + this.currentIndex - 1) % this.size;
        this.goToSlide(prevIndex);
    };

    /**
     * Transition to the next slide
     */
    Carousel.prototype.next = function() {
        var nextIndex = (this.currentIndex + 1) % this.size;
        this.goToSlide(nextIndex);
    };

    // add to global namespace
    win.Carousel = Carousel;

    // add as jQuery plugin
    $.fn.carousel = function(options) {
        //TODO: add options and extend functionality
        if (!this.data('carousel')) {
            this.data('carousel', new Carousel(this, options));
        }
        return this.data('carousel');
    };


}(jQuery, window));
