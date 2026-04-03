/**
 * Export XPUB Screen
 * Displays extended public key (xpub) with QR code
 */
var ExportXpubScreen = {
  id: "export-xpub-screen",
  xpub: null,

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Export XPUB</div>' +
      '<div class="header-subtitle">Extended Public Key</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div id="xpub-display" class="address-display">' +
      // CHANGED: Unique ID for this screen's QR container
      '<div id="xpub-qr-container" class="qr-container"></div>' +
      '<div id="xpub-text" class="address-text"></div>' +
      "</div>" +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center"></div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
    });

    this.loadXpub();
  },

  onExit: function () {
    this.xpub = null;
  },

  loadXpub: function () {
    try {
      // Read zpub directly from stored wallet data (no password needed)
      this.xpub = WalletService.getZpub();
      if (!this.xpub) {
        this.showError("No wallet found");
        return;
      }

      // Update display
      this.updateDisplay();
    } catch (error) {
      console.error("Failed to load xpub:", error);
      this.showError("Error: " + error.message);
    }
  },

  updateDisplay: function () {
    // Update xpub text
    var xpubTextEl = document.getElementById("xpub-text");
    if (xpubTextEl && this.xpub) {
      xpubTextEl.textContent = this.xpub;
    }

    // Generate QR code - use requestAnimationFrame to ensure DOM is ready
    var self = this;
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        self.generateQRCode(self.xpub);
      });
    } else {
      // Fallback for older browsers
      setTimeout(function () {
        self.generateQRCode(self.xpub);
      }, 50);
    }
  },

  generateQRCode: function (xpub) {
    // CHANGED: targeted the unique ID
    var container = document.getElementById("xpub-qr-container");

    if (!container) {
      console.error("QR container not found");
      return;
    }

    if (typeof window.qrcode === "undefined") {
      container.innerHTML = "Lib Error";
      return;
    }

    try {
      container.innerHTML = "";

      if (!xpub) return;

      // XPUBs are long (~111 chars), so we use Type 0 (Auto) with Level L (Low)
      // to keep the module count as low as possible for the small screen.
      var qr = window.qrcode(0, "L");
      qr.addData(xpub);
      qr.make();

      var qrTable = document.createElement("table");
      qrTable.className = "qr-code";
      qrTable.cellPadding = "0";
      qrTable.cellSpacing = "0";

      var qrSize = qr.getModuleCount();

      // XPUBs usually require Version 6 (41 modules) or 7 (45 modules).
      // On KaiOS (QVGA 240x320), we need to be careful with width.
      // 45 modules * 3px = 135px (Fits well)
      // 53 modules * 3px = 159px (Fits well)
      // If it gets denser, we drop to 2px.
      var cellSize = qrSize > 55 ? 2 : 3;

      for (var row = 0; row < qrSize; row++) {
        var tr = document.createElement("tr");
        for (var col = 0; col < qrSize; col++) {
          var td = document.createElement("td");
          td.style.width = cellSize + "px";
          td.style.height = cellSize + "px";
          td.style.backgroundColor = qr.isDark(row, col)
            ? "#000000"
            : "#ffffff";
          tr.appendChild(td);
        }
        qrTable.appendChild(tr);
      }

      container.appendChild(qrTable);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      container.innerHTML = "QR Error";
    }
  },

  showError: function (message) {
    var container = document.getElementById("xpub-display");
    if (container) {
      container.innerHTML =
        '<div style="padding:20px;text-align:center;color:#cc0000;">' +
        message +
        "</div>";
    }
  },

  handleSelect: function (action, index) {
    // No actions needed for xpub screen
  },

  handleBack: function () {
    App.showScreen("home");
  },
};
