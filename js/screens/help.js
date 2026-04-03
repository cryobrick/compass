/**
 * Help Screen - Displays website QR code and link
 */
var HelpScreen = {
  id: "help-screen",

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Help</div>' +
      '<div class="header-subtitle">Visit our website</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div class="address-display">' +
      '<div id="help-qr-container" class="qr-container"></div>' +
      '<div id="help-url-text" class="address-text" style="font-size:13px;">https://www.cryobrick.com/</div>' +
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
      onSelect: function () {},
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
    });

    this.generateQRCode();
  },

  onExit: function () {
    // Cleanup
  },

  generateQRCode: function () {
    var container = document.getElementById("help-qr-container");

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

      var qr = window.qrcode(0, "L");
      qr.addData("https://www.cryobrick.com/");
      qr.make();

      var qrTable = document.createElement("table");
      qrTable.className = "qr-code";
      qrTable.cellPadding = "0";
      qrTable.cellSpacing = "0";

      var qrSize = qr.getModuleCount();
      var cellSize = 5;

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

  handleBack: function () {
    App.showScreen("home");
  },
};
