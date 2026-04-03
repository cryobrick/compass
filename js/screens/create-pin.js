/**
 * Create PIN Screen - First-time or migration PIN setup
 * Two steps: Enter 6-digit PIN, then confirm. Numbers only, 6 digits.
 */
var CreatePinScreen = {
  id: "create-pin-screen",
  step: 1,
  enteredSequence: "",
  firstPin: "",
  keyHandler: null,

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title" id="create-pin-title">Create PIN</div>' +
      '<div class="header-subtitle" id="create-pin-subtitle">Enter 6-digit PIN. Numbers only.</div>' +
      "</div>" +
      '<div class="screen-content create-pin-content">' +
      '<div class="create-pin-dots" id="create-pin-dots">' +
      '<span class="create-pin-dot"></span>' +
      '<span class="create-pin-dot"></span>' +
      '<span class="create-pin-dot"></span>' +
      '<span class="create-pin-dot"></span>' +
      '<span class="create-pin-dot"></span>' +
      '<span class="create-pin-dot"></span>' +
      "</div>" +
      '<div id="create-pin-error" class="create-pin-error" style="display: none;"></div>' +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left" id="create-pin-back">BACK</div>' +
      '<div class="softkey softkey-center"></div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    var self = this;
    this.step = 1;
    this.enteredSequence = "";
    this.firstPin = "";
    this.updateTitleAndSubtitle();
    this.updateDots();
    this.hideError();

    this.keyHandler = function (e) {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        e.stopPropagation();
        self.handleKeyPress(e.key);
      } else if (
        (e.key === "Backspace" || e.key === "Escape" || e.key === "BrowserBack") &&
        self.step === 2
      ) {
        e.preventDefault();
        e.stopPropagation();
        self.handleBack();
      }
    };
    document.addEventListener("keydown", this.keyHandler, true);

    Navigation.setCallbacks({
      onBack: function () {
        if (self.step === 2) self.handleBack();
      },
      onSoftLeft: function () {
        if (self.step === 2) self.handleBack();
      },
    });
  },

  onExit: function () {
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler, true);
      this.keyHandler = null;
    }
  },

  updateTitleAndSubtitle: function () {
    var title = document.getElementById("create-pin-title");
    var subtitle = document.getElementById("create-pin-subtitle");
    if (title) {
      title.textContent = this.step === 1 ? "Create PIN" : "Confirm PIN";
    }
    if (subtitle) {
      subtitle.textContent =
        this.step === 1
          ? "Enter 6-digit PIN. Numbers only."
          : "Enter 6-digit PIN again.";
    }
    var backEl = document.getElementById("create-pin-back");
    if (backEl) {
      backEl.textContent = this.step === 2 ? "BACK" : "";
    }
  },

  updateDots: function () {
    var dots = document.querySelectorAll("#create-pin-dots .create-pin-dot");
    var len = this.enteredSequence.length;
    for (var i = 0; i < 6; i++) {
      if (dots[i]) {
        dots[i].textContent = i < len ? "•" : "";
        dots[i].classList.toggle("filled", i < len);
      }
    }
  },

  showError: function (message) {
    var el = document.getElementById("create-pin-error");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  },

  hideError: function () {
    var el = document.getElementById("create-pin-error");
    if (el) {
      el.textContent = "";
      el.style.display = "none";
    }
  },

  handleKeyPress: function (key) {
    if (this.enteredSequence.length >= 6) return;
    this.enteredSequence += key;
    this.updateDots();

    if (this.enteredSequence.length === 6) {
      if (this.step === 1) {
        this.firstPin = this.enteredSequence;
        this.step = 2;
        this.enteredSequence = "";
        this.updateTitleAndSubtitle();
        this.updateDots();
      } else {
        if (this.enteredSequence === this.firstPin) {
          var self = this;
          PinService.setPin(this.enteredSequence)
            .then(function () {
              if (WalletService.hasWallet()) {
                App.showScreen("home");
              } else {
                App.showScreen("welcome");
              }
            })
            .catch(function (err) {
              self.showError(err.message || "Failed to save PIN");
              self.enteredSequence = "";
              self.updateDots();
            });
        } else {
          this.showError("PINs do not match. Try again.");
          this.enteredSequence = "";
          this.updateDots();
        }
      }
    }
  },

  handleBack: function () {
    if (this.step === 2) {
      this.step = 1;
      this.enteredSequence = "";
      this.firstPin = "";
      this.updateTitleAndSubtitle();
      this.updateDots();
      this.hideError();
    }
  },
};
