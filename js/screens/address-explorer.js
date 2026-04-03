/**
 * Address Explorer Screen
 * Displays Native SegWit addresses (BIP84) with QR code
 */
var AddressExplorerScreen = {
  id: "address-explorer-screen",
  currentIndex: 0,
  currentAddress: null,

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Address Explorer</div>' +
      '<div class="header-subtitle">Native SegWit (BIP84)</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div id="address-display" class="address-display">' +
      '<div id="qr-container" class="qr-container"></div>' +
      '<div id="address-text" class="address-text"></div>' +
      '<div id="address-index" class="address-index"></div>' +
      '<div class="menu-item focusable" data-index="0" data-action="change-address">' +
      "New Address" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center">SELECT</div>' +
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

    this.currentIndex = 0;
    this.loadAddress();
  },

  onExit: function () {
    this.currentIndex = 0;
    this.currentAddress = null;
  },

  loadAddress: function () {
    try {
      var zpub = WalletService.getZpub();
      if (!zpub) {
        this.showError("No wallet found");
        return;
      }

      // Generate address from zpub (no mnemonic/password needed)
      var addressData = WalletService.getAddressFromZpub(
        zpub,
        this.currentIndex,
        false
      );
      this.currentAddress = addressData.address;

      // Update display
      this.updateDisplay();
    } catch (error) {
      console.error("Failed to load address:", error);
      this.showError("Error: " + error.message);
    }
  },

  updateDisplay: function () {
    // Update address text
    var addressTextEl = document.getElementById("address-text");
    if (addressTextEl && this.currentAddress) {
      addressTextEl.textContent = this.currentAddress;
    }

    // Update index
    var indexEl = document.getElementById("address-index");
    if (indexEl) {
      indexEl.textContent = "Index " + this.currentIndex;
    }

    // Generate QR code
    this.generateQRCode(this.currentAddress);
  },

  generateQRCode: function (address) {
    var container = document.getElementById("qr-container");
    if (!container) return;

    // Check if QR library is loaded
    if (typeof window.qrcode === "undefined") {
      container.innerHTML =
        '<div style="padding:20px;text-align:center;color:#cc0000;font-size:11px;">' +
        "QR library not loaded" +
        "</div>";
      return;
    }

    try {
      // Clear container
      container.innerHTML = "";

      // Create QR code (Type 0 = Auto, Error correction level M)
      var qr = window.qrcode(0, "M");
      qr.addData(address);
      qr.make();

      // Create table for QR code
      var qrTable = document.createElement("table");
      qrTable.className = "qr-code";
      qrTable.cellPadding = "0";
      qrTable.cellSpacing = "0";

      var qrSize = qr.getModuleCount();
      // Calculate cell size to fit within ~180px width (leaving padding)
      // Most QR codes are 25-29 modules, so 180/29 ≈ 6px per cell
      // But we'll use 3px for better balance on small screen
      var cellSize = 3;

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
      container.innerHTML =
        '<div style="padding:20px;text-align:center;color:#cc0000;font-size:11px;">' +
        "QR Error" +
        "</div>";
    }
  },

  showError: function (message) {
    var container = document.getElementById("address-display");
    if (container) {
      container.innerHTML =
        '<div style="padding:20px;text-align:center;color:#cc0000;">' +
        message +
        "</div>";
    }
  },

  handleSelect: function (action, index) {
    if (action === "change-address") {
      // Increment index and load next address
      this.currentIndex++;
      this.loadAddress();
      // Refresh focus to keep it on the button
      Navigation.refreshFocusableItems();
    }
  },

  handleBack: function () {
    App.showScreen("home");
  },
};
