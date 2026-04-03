/**
 * Compass Screen - Plausible Deniability
 * Fake compass app that unlocks wallet when the user enters their 6-digit PIN
 */
var CompassScreen = {
  id: "compass-screen",
  enteredSequence: "",
  baseRotation: 0, // Base compass rotation (points north)
  unlockRotation: 0, // Additional rotation when entering code

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Compass</div>' +
      '<div class="header-subtitle">Navigation Tool</div>' +
      "</div>" +
      '<div class="screen-content compass-content">' +
      '<div class="compass-container">' +
      '<div class="compass-ring">' +
      '<div class="compass-markings">' +
      '<div class="compass-mark compass-mark-n">N</div>' +
      '<div class="compass-mark compass-mark-e">E</div>' +
      '<div class="compass-mark compass-mark-s">S</div>' +
      '<div class="compass-mark compass-mark-w">W</div>' +
      "</div>" +
      '<div class="compass-needle-container" id="compass-needle-container">' +
      '<div class="compass-needle compass-needle-north"></div>' +
      '<div class="compass-needle compass-needle-south"></div>' +
      "</div>" +
      '<div class="compass-center"></div>' +
      "</div>" +
      '<div class="compass-info">' +
      '<div class="compass-degree" id="compass-degree">0°</div>' +
      '<div class="compass-direction" id="compass-direction">North</div>' +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left"></div>' +
      '<div class="softkey softkey-center"></div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    var self = this;
    this.enteredSequence = "";
    this.unlockRotation = 0;

    Navigation.setCallbacks({
      onBack: function () {
        window.close();
      },
    });

    // Initialize compass with slight random rotation to make it look realistic
    this.baseRotation = Math.random() * 10 - 5; // -5 to +5 degrees
    this.updateCompassRotation();

    // Listen for key presses (numbers only)
    // We'll intercept number keys before Navigation handles them
    this.keyHandler = function (e) {
      // Only listen to number keys (0-9)
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault(); // Prevent Navigation from handling it
        e.stopPropagation(); // Stop event bubbling
        self.handleKeyPress(e.key);
      }
    };

    // Use capture phase to intercept before Navigation
    document.addEventListener("keydown", this.keyHandler, true);

    // Animate compass slightly to make it look alive
    this.startCompassAnimation();
  },

  onExit: function () {
    // Remove key handler
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler, true);
      this.keyHandler = null;
    }
    this.stopCompassAnimation();
  },

  handleKeyPress: function (key) {
    var self = this;
    this.enteredSequence += key;

    var pinLength = PinService.PIN_LENGTH || 6;
    if (this.enteredSequence.length > pinLength) {
      this.enteredSequence = this.enteredSequence.slice(-pinLength);
    }

    if (this.enteredSequence.length === pinLength) {
      PinService.verifyPin(this.enteredSequence).then(function (valid) {
        if (valid) {
          self.unlock();
        } else {
          self.enteredSequence = "";
          self.unlockRotation = 0;
          self.updateCompassRotation();
        }
      });
    } else {
      this.rotateOnKeyPress();
    }
  },

  rotateOnKeyPress: function () {
    // Rotate compass needle slightly for each correct key
    // Each key adds 15 degrees of rotation
    var progress = this.enteredSequence.length;
    this.unlockRotation = progress * 15;
    this.updateCompassRotation();

    // Add a subtle animation
    var needleContainer = document.getElementById("compass-needle-container");
    if (needleContainer) {
      needleContainer.style.transition = "transform 0.3s ease";
      setTimeout(function () {
        if (needleContainer) {
          needleContainer.style.transition = "";
        }
      }, 300);
    }
  },

  updateCompassRotation: function () {
    var totalRotation = this.baseRotation + this.unlockRotation;
    var needleContainer = document.getElementById("compass-needle-container");
    var degreeEl = document.getElementById("compass-degree");
    var directionEl = document.getElementById("compass-direction");

    if (needleContainer) {
      needleContainer.style.transform = "rotate(" + totalRotation + "deg)";
    }

    // Update degree display (normalize to 0-360)
    var displayDegree = ((totalRotation % 360) + 360) % 360;
    if (degreeEl) {
      degreeEl.textContent = Math.round(displayDegree) + "°";
    }

    // Update direction
    if (directionEl) {
      var direction = this.getDirection(displayDegree);
      directionEl.textContent = direction;
    }
  },

  getDirection: function (degree) {
    var directions = [
      "North",
      "NNE",
      "NE",
      "ENE",
      "East",
      "ESE",
      "SE",
      "SSE",
      "South",
      "SSW",
      "SW",
      "WSW",
      "West",
      "WNW",
      "NW",
      "NNW",
    ];
    var index = Math.round(degree / 22.5) % 16;
    return directions[index];
  },

  startCompassAnimation: function () {
    var self = this;
    // Subtle random movement to simulate compass settling
    this.animationInterval = setInterval(function () {
      // Only animate if not unlocking
      if (self.enteredSequence.length === 0) {
        // Slight random drift
        var drift = (Math.random() - 0.5) * 2; // -1 to +1 degrees
        self.baseRotation += drift;
        // Keep base rotation within reasonable bounds
        if (self.baseRotation > 10) self.baseRotation = 10;
        if (self.baseRotation < -10) self.baseRotation = -10;
        self.updateCompassRotation();
      }
    }, 2000); // Update every 2 seconds
  },

  stopCompassAnimation: function () {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  },

  unlock: function () {
    // Stop animation
    this.stopCompassAnimation();

    // Remove key handler
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler, true);
      this.keyHandler = null;
    }

    // Navigate to appropriate screen based on wallet state
    if (WalletService.hasWallet()) {
      App.showScreen("home");
    } else {
      App.showScreen("welcome");
    }
  },
};
