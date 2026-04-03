/**
 * Backup Screen
 * Shows the decrypted 12-word mnemonic after password verification.
 * User reaches this via Home → Backup → Enter Password → this screen.
 */
var BackupScreen = {
  id: "backup-screen",
  _mnemonic: null,

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Backup</div>' +
      '<div class="header-subtitle">Write down these 12 words</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div id="backup-mnemonic-display" class="mnemonic-list"></div>' +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center"></div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  setMnemonic: function (mnemonic) {
    this._mnemonic = mnemonic;
  },

  onEnter: function () {
    Navigation.setCallbacks({
      onSelect: function () {},
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
    });

    this.displayMnemonic();
    Navigation.refreshFocusableItems();
  },

  onExit: function () {
    // Clear mnemonic from memory and DOM
    this._mnemonic = null;
    var container = document.getElementById("backup-mnemonic-display");
    if (container) container.innerHTML = "";
  },

  displayMnemonic: function () {
    var container = document.getElementById("backup-mnemonic-display");
    if (!container || !this._mnemonic) return;

    var words = this._mnemonic.split(" ");
    var html = "";

    for (var i = 0; i < words.length; i++) {
      html +=
        '<div class="menu-item mnemonic-word" data-index="' +
        i +
        '">' +
        '<span class="word-number">' +
        (i + 1) +
        ".</span>" +
        '<span class="word-text">' +
        words[i] +
        "</span>" +
        "</div>";
    }

    container.innerHTML = html;
  },

  handleBack: function () {
    App.showScreen("home");
  },
};
