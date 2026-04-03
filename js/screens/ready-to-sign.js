/**
 * Ready To Sign Screen
 * Allows user to scan/input PSBT, review transaction, and sign it
 *
 * ALTERNATIVE IMPLEMENTATION: Uses PSBTServiceAlternative which requires no external libraries
 * Only uses bitcoinjs-lib (already loaded) - works with Firefox 48
 */
var ReadyToSignScreen = {
  id: "ready-to-sign-screen",
  currentState: "scanning", // "scanning" | "review" | "signing" | "signed"
  psbt: null,
  signedPSBT: null,
  _pendingPasswordReturn: false, // true when navigating to enter-password
  // Removed QR scanning related properties - no longer needed

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Ready To Sign</div>' +
      '<div class="header-subtitle">PSBT Transaction</div>' +
      "</div>" +
      '<div class="screen-content">' +
      // Library status indicator (visible at top)
      '<div id="psbt-library-status" class="library-status" style="display: none;">' +
      '<div id="library-status-text" class="library-status-text"></div>' +
      "</div>" +
      // Input state - simplified for base64 PSBT only
      '<div id="psbt-scanning-state" class="psbt-state">' +
      '<div class="psbt-instructions">' +
      "Load PSBT Transaction" +
      "</div>" +
      '<div id="psbt-scanning-error" class="error-message" style="display: none;"></div>' +
      '<div class="menu-item focusable" data-index="0" data-action="import-psbt-file">' +
      "Import PSBT File" +
      "</div>" +
      '<input type="file" id="psbt-file-input" accept=".psbt" style="display: none;" />' +
      // Manual entry for base64 PSBT
      '<div id="manual-entry-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">' +
      '<div class="psbt-instructions" style="font-size: 11px; margin-bottom: 8px; color: #666;">' +
      "Or paste base64 PSBT:" +
      "</div>" +
      '<textarea id="manual-ur-input" class="psbt-textarea" placeholder="Paste base64 PSBT here..." style="min-height: 80px; font-size: 10px; font-family: monospace;"></textarea>' +
      '<div class="menu-item focusable" data-index="1" data-action="process-manual-entry" style="margin-top: 8px;">' +
      "Process PSBT" +
      "</div>" +
      "</div>" +
      "</div>" +
      // Review state
      '<div id="psbt-review-state" class="psbt-state" style="display: none;">' +
      '<div id="psbt-review-error" class="error-message" style="display: none;"></div>' +
      '<div class="transaction-details">' +
      '<div id="tx-details-content"></div>' +
      "</div>" +
      '<div class="menu-item focusable" data-action="sign-psbt">' +
      "Sign Transaction" +
      "</div>" +
      '<div class="menu-item focusable" data-action="cancel-psbt">' +
      "Cancel" +
      "</div>" +
      "</div>" +
      // Signing state
      '<div id="psbt-signing-state" class="psbt-state" style="display: none;">' +
      '<div class="loading-message">Signing transaction...</div>' +
      "</div>" +
      // Signed state
      '<div id="psbt-signed-state" class="psbt-state" style="display: none;">' +
      '<div class="success-message">✅ Transaction Signed!</div>' +
      '<div id="signed-psbt-qr-container" class="qr-container"></div>' +
      '<div id="signed-psbt-text" class="address-text"></div>' +
      '<div class="psbt-instructions">Copy the transaction hex below and broadcast it. This is the final signed transaction, not a PSBT.</div>' +
      '<div class="menu-item focusable" data-index="0" data-action="done-psbt">' +
      "Done" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center" id="softkey-center">SELECT</div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    var self = this;
    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
      onFocusChange: function () {
        self.updateSoftkeys();
      },
    });

    // If returning from password entry, don't reset — preserve PSBT state
    if (this._pendingPasswordReturn) {
      this._pendingPasswordReturn = false;
      Navigation.refreshFocusableItems();
      return;
    }

    this.reset();
    // Don't need setupEventListeners anymore - using Navigation system
    Navigation.refreshFocusableItems();

    // ALTERNATIVE APPROACH: Use PSBTServiceAlternative which uses only bitcoinjs-lib
    // No external libraries needed - works with Firefox 48
    if (typeof PSBTServiceAlternative === "undefined") {
      this.updateLibraryStatus(
        "error",
        "PSBT service not loaded.\nPlease check psbt-alternative.js"
      );
    } else if (typeof window.bitcoin === "undefined") {
      this.updateLibraryStatus(
        "error",
        "bitcoinjs-lib not loaded.\nRequired for PSBT operations."
      );
    } else {
      // PSBT service ready - uses only bitcoinjs-lib (already loaded)
      this.updateLibraryStatus("success", "PSBT service ready");
      setTimeout(function () {
        self.hideLibraryStatus();
      }, 2000);
    }
  },

  // Removed loadPSBTLibrary and loadLibrarySequentially - no longer needed
  // The alternative PSBT service uses only bitcoinjs-lib which is already loaded

  onExit: function () {
    // Don't cleanup if navigating to enter-password (preserve PSBT state)
    if (!this._pendingPasswordReturn) {
      this.cleanup();
    }
  },

  reset: function () {
    this.currentState = "scanning";
    this.psbt = null;
    this.signedPSBT = null;
    this.hideError(); // Clear any error messages
    // Reset UR decoder if using original service
    if (typeof PSBTService !== "undefined" && PSBTService.resetURDecoder) {
      PSBTService.resetURDecoder();
    }
    this.showState("scanning");
  },

  cleanup: function () {
    // Reset UR decoder if using original service
    if (typeof PSBTService !== "undefined" && PSBTService.resetURDecoder) {
      PSBTService.resetURDecoder();
    }
  },

  // Removed setupEventListeners - now using Navigation system with handleSelect

  showState: function (state) {
    var root = document.getElementById(this.id);
    if (!root) return;

    // Hide all states
    var states = ["scanning", "review", "signing", "signed"];
    for (var i = 0; i < states.length; i++) {
      var stateEl = root.querySelector("#psbt-" + states[i] + "-state");
      if (stateEl) {
        stateEl.style.display = "none";
      }
    }

    // Show current state
    var currentStateEl = root.querySelector("#psbt-" + state + "-state");
    if (currentStateEl) {
      currentStateEl.style.display = "block";
    }

    this.currentState = state;

    // Refresh navigation to pick up new focusable items
    Navigation.refreshFocusableItems();
  },

  /**
   * Process base64 PSBT string (from manual entry)
   * @param {string} psbtString - Base64 encoded PSBT
   */
  processPSBTString: function (psbtString) {
    if (!psbtString || !psbtString.trim()) {
      this.showError("Please enter a base64 PSBT");
      return;
    }

    this.hideError();

    try {
      var base64PSBT = psbtString.trim();

      // Use alternative service (no external libraries needed)
      var psbtService =
        typeof PSBTServiceAlternative !== "undefined"
          ? PSBTServiceAlternative
          : PSBTService;

      this.psbt = psbtService.parsePSBT(base64PSBT);
      var txInfo = psbtService.getTransactionInfo(this.psbt);
      this.showReviewState(txInfo);
    } catch (parseError) {
      this.showError("Failed to parse PSBT:\n" + parseError.message);
      console.error("PSBT Parse Error:", parseError);
    }
  },

  // Removed all QR scanning functions - no longer needed without QR scanning

  /**
   * Truncate address for 240px display: first 10 + "..." + last 6
   */
  truncateAddress: function (addr) {
    if (!addr) return "(unknown script)";
    if (addr.length <= 18) return addr;
    return addr.substring(0, 10) + "..." + addr.substring(addr.length - 6);
  },

  showReviewState: function (txInfo) {
    var self = this;
    var root = document.getElementById(this.id);
    var detailsEl = root.querySelector("#tx-details-content");

    if (!detailsEl) return;

    // Run change detection if we have outputDetails and zpub
    var psbtService =
      typeof PSBTServiceAlternative !== "undefined"
        ? PSBTServiceAlternative
        : null;

    if (psbtService && txInfo.outputDetails) {
      var zpub = WalletService.getZpub();
      if (zpub) {
        psbtService.identifyChangeOutputs(txInfo.outputDetails, zpub);
      }
      txInfo.feeWarning = psbtService.computeFeeWarning(txInfo);
    }

    // Compute send summary (non-change outputs)
    var sendOutputs = [];
    var sendTotal = 0;
    var changeTotal = 0;
    if (txInfo.outputDetails) {
      for (var i = 0; i < txInfo.outputDetails.length; i++) {
        var out = txInfo.outputDetails[i];
        if (out.isChange) {
          changeTotal += out.valueSat;
        } else {
          sendTotal += out.valueSat;
          sendOutputs.push(out);
        }
      }
    }

    var html = "";

    // Section A — Send Summary
    if (sendOutputs.length > 0) {
      html +=
        '<div class="tx-summary-section focusable">' +
        '<div class="tx-summary-label">SENDING</div>' +
        '<div class="tx-summary-amount">' +
        (sendTotal / 100000000).toFixed(8) +
        " BTC</div>";
      if (sendOutputs.length === 1) {
        html +=
          '<div class="tx-summary-to">to ' +
          this.truncateAddress(sendOutputs[0].address) +
          "</div>";
      } else {
        html +=
          '<div class="tx-summary-to">to ' +
          sendOutputs.length +
          " addresses</div>";
      }
      html += "</div>";
    }

    // Section B — Per-Output List
    if (txInfo.outputDetails && txInfo.outputDetails.length > 0) {
      for (var i = 0; i < txInfo.outputDetails.length; i++) {
        var out = txInfo.outputDetails[i];
        var typeClass = out.isChange ? "type-change" : "type-send";
        var typeLabel = out.isChange ? "CHANGE" : "SEND";

        html +=
          '<div class="tx-output-item focusable" data-action="show-full-address" data-address="' +
          (out.address || "") +
          '" data-index="' +
          i +
          '">' +
          '<div class="tx-output-header">' +
          '<span class="tx-output-label">Output ' +
          (out.index + 1) +
          '</span>' +
          '<span class="tx-output-type ' +
          typeClass +
          '">' +
          typeLabel +
          "</span>" +
          '<span class="tx-output-amount">' +
          out.valueBTC +
          "</span>" +
          "</div>" +
          '<div class="tx-output-address">' +
          this.truncateAddress(out.address) +
          "</div>" +
          "</div>";
      }
    }

    // Section C — Fee
    if (txInfo.fee !== null) {
      var feeBtc = (txInfo.fee / 100000000).toFixed(8);
      var feePercent = sendTotal > 0 ? ((txInfo.fee / sendTotal) * 100).toFixed(1) : "0.0";
      html +=
        '<div class="tx-fee-section">' +
        '<div class="tx-detail-item">' +
        '<div class="tx-detail-label">Fee:</div>' +
        '<div class="tx-detail-value">' +
        feeBtc +
        " BTC (" +
        feePercent +
        "%)</div>" +
        "</div>" +
        "</div>";
    }

    // Fee warning
    if (txInfo.feeWarning) {
      var warningClass = "fee-warning";
      if (txInfo.feeWarning.level === "extreme") {
        warningClass += " fee-warning-extreme";
      } else if (txInfo.feeWarning.level === "unknown") {
        warningClass += " fee-warning-unknown";
      }
      html +=
        '<div class="' + warningClass + '">' + txInfo.feeWarning.message + "</div>";
    }

    // Network info
    html +=
      '<div class="tx-detail-item" style="margin-top: 4px;">' +
      '<div class="tx-detail-label">Network:</div>' +
      '<div class="tx-detail-value">' +
      (txInfo.network || "mainnet") +
      "</div>" +
      "</div>";

    detailsEl.innerHTML = html;
    this.showState("review");
  },

  handleSignPSBT: function () {
    if (!this.psbt) {
      this.showError("No PSBT to sign");
      return;
    }

    var self = this;

    // Set up callbacks for the enter-password screen
    EnterPasswordScreen.setCallbacksForDecryption(
      function (mnemonic) {
        // On success: navigate back to ready-to-sign and perform signing
        self._pendingPasswordReturn = true;
        App.showScreen("ready-to-sign");
        // Restore the review state visuals, then sign
        self.showState("review");
        setTimeout(function () {
          self.performSigning(mnemonic);
          // Clear mnemonic reference
          mnemonic = null;
        }, 50);
      },
      function () {
        // On cancel: go back to ready-to-sign review state
        self._pendingPasswordReturn = true;
        App.showScreen("ready-to-sign");
        self.showState("review");
      }
    );
    // Mark that we're pending a return from password entry
    self._pendingPasswordReturn = true;
    // Navigate to enter-password screen
    App.showScreen("enter-password");
  },

  /**
   * Perform the actual PSBT signing with a decrypted mnemonic
   * @param {string} mnemonic - Decrypted mnemonic
   */
  performSigning: function (mnemonic) {
    var self = this;

    // Show signing state
    this.showState("signing");

    // Sign PSBT (async to allow UI update)
    setTimeout(function () {
      try {
        // Use alternative service (no external libraries needed)
        var psbtService =
          typeof PSBTServiceAlternative !== "undefined"
            ? PSBTServiceAlternative
            : PSBTService;
        self.signedPSBT = psbtService.signPSBT(self.psbt, mnemonic);

        // Clear mnemonic from this scope
        mnemonic = null;

        // Verify that the PSBT was actually signed
        var hasSignatures = false;
        if (self.signedPSBT && self.signedPSBT.inputs) {
          for (var i = 0; i < self.signedPSBT.inputs.length; i++) {
            var input = self.signedPSBT.inputs[i];
            if (input.partialSig && input.partialSig.length > 0) {
              hasSignatures = true;
              break;
            }
          }
        }

        if (!hasSignatures) {
          throw new Error(
            "PSBT was not signed. This transaction may not belong to your wallet. " +
              "Please check that the PSBT was created from the same wallet that exported the zpub."
          );
        }

        self.showSignedState();
      } catch (error) {
        // Show detailed error message to user
        var errorMsg = error.message || "Failed to sign PSBT";

        // Make error message more user-friendly
        if (
          errorMsg.includes("different wallet") ||
          errorMsg.includes("Public key mismatch")
        ) {
          errorMsg =
            "This PSBT is from a different wallet!\n\n" +
            "This transaction was created from a wallet that doesn't match your wallet. ";
        } else if (errorMsg.includes("No inputs were signed")) {
          errorMsg =
            "Unable to sign this transaction!\n\n" +
            "This PSBT cannot be signed with your wallet. " +
            "It may be from a different wallet or already fully signed.";
        }

        self.showError(errorMsg);
        console.error("PSBT Sign Error:", error);
        self.showState("review");
      }
    }, 100);
  },

  showSignedState: function () {
    if (!this.signedPSBT) {
      this.showError("No signed PSBT available");
      return;
    }

    try {
      // Extract final transaction from signed PSBT for broadcasting
      // Use alternative service
      var psbtService =
        typeof PSBTServiceAlternative !== "undefined"
          ? PSBTServiceAlternative
          : PSBTService;

      // Extract the final transaction (hex) for broadcasting
      var finalTxHex = null;
      try {
        if (psbtService.extractTransaction) {
          finalTxHex = psbtService.extractTransaction(this.signedPSBT);
          console.log(
            "Extracted transaction hex (first 50 chars):",
            finalTxHex.substring(0, 50)
          );
          // Verify it's actually hex (not base64 PSBT)
          if (
            finalTxHex.startsWith("cHNidP8B") ||
            finalTxHex.toLowerCase().match(/^[0-9a-f]{2,}$/) === null
          ) {
            console.error(
              "Warning: extractTransaction returned non-hex value, might be PSBT"
            );
            throw new Error("Transaction extraction returned invalid format");
          }
        } else {
          throw new Error("extractTransaction function not available");
        }
      } catch (error) {
        console.error("Failed to extract transaction:", error);
        this.showError(
          "Failed to extract transaction for broadcasting: " + error.message
        );
        return;
      }

      // Display QR code and text
      var root = document.getElementById(this.id);
      var qrContainer = root.querySelector("#signed-psbt-qr-container");
      var textEl = root.querySelector("#signed-psbt-text");

      if (textEl) {
        // Truncate for display
        var displayText =
          finalTxHex.length > 50
            ? finalTxHex.substring(0, 50) + "..."
            : finalTxHex;
        textEl.textContent = displayText;
        textEl.title = finalTxHex; // Full text on hover
      }

      if (qrContainer) {
        // Generate QR code with the final transaction hex
        this.generateQRCode(finalTxHex, qrContainer);
      }

      // Store the final transaction hex for export
      this.finalTransactionHex = finalTxHex;

      this.showState("signed");
    } catch (error) {
      this.showError("Failed to display signed PSBT: " + error.message);
      console.error("Display Error:", error);
    }
  },

  generateQRCode: function (text, container) {
    if (typeof window.qrcode === "undefined") {
      console.error("QR code library not loaded");
      return;
    }

    try {
      // Clear container
      container.innerHTML = "";

      // Generate QR code
      var qr = window.qrcode(0, "L"); // Error correction level L
      qr.addData(text);
      qr.make();

      // Create table
      var table = document.createElement("table");
      table.className = "qr-code";

      var qrSize = qr.getModuleCount();
      var cellSize = Math.max(2, Math.floor(200 / qrSize)); // Max 200px, min 2px per cell

      for (var row = 0; row < qrSize; row++) {
        var tr = document.createElement("tr");
        for (var col = 0; col < qrSize; col++) {
          var td = document.createElement("td");
          td.style.width = cellSize + "px";
          td.style.height = cellSize + "px";
          if (qr.isDark(row, col)) {
            td.style.backgroundColor = "#000000";
          } else {
            td.style.backgroundColor = "#ffffff";
          }
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }

      container.appendChild(table);
    } catch (error) {
      console.error("QR Code Generation Error:", error);
      container.innerHTML =
        '<div class="error-message">Failed to generate QR code</div>';
    }
  },

  /**
   * Update library status indicator in UI
   * @param {string} status - "loading", "success", or "error"
   * @param {string} message - Status message to display
   */
  updateLibraryStatus: function (status, message) {
    var root = document.getElementById(this.id);
    if (!root) return;

    var statusEl = root.querySelector("#psbt-library-status");
    var statusTextEl = root.querySelector("#library-status-text");

    if (!statusEl || !statusTextEl) return;

    // Remove all status classes
    statusEl.classList.remove("loading", "success", "error");

    // Add current status class
    statusEl.classList.add(status);

    // Update text
    statusTextEl.textContent = message;

    // Show the status indicator
    statusEl.style.display = "block";
  },

  /**
   * Hide library status indicator
   */
  hideLibraryStatus: function () {
    var root = document.getElementById(this.id);
    if (!root) return;

    var statusEl = root.querySelector("#psbt-library-status");
    if (statusEl) {
      statusEl.style.display = "none";
    }
  },

  showError: function (message) {
    var root = document.getElementById(this.id);
    if (!root) return;

    // Try to show error in current state
    var errorEl = null;

    if (this.currentState === "scanning") {
      errorEl = root.querySelector("#psbt-scanning-error");
    } else if (
      this.currentState === "review" ||
      this.currentState === "signing"
    ) {
      errorEl = root.querySelector("#psbt-review-error");
    }

    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = "block";
      // Scroll error into view if needed
      // Use boolean syntax for Firefox 48 compatibility (KaiOS 2.5)
      // true = align to top, false = align to bottom
      try {
        errorEl.scrollIntoView(true);
      } catch (e) {
        // If all else fails, just show the error without scrolling
        console.log("Could not scroll error into view:", e);
      }
    } else {
      // Fallback to alert if we can't find the error element
      alert(message);
    }
  },

  hideError: function () {
    var root = document.getElementById(this.id);
    if (!root) return;

    var scanningError = root.querySelector("#psbt-scanning-error");
    var reviewError = root.querySelector("#psbt-review-error");

    if (scanningError) {
      scanningError.style.display = "none";
    }
    if (reviewError) {
      reviewError.style.display = "none";
    }
  },

  handleDone: function () {
    this.reset();
  },

  handleSelect: function (action, index) {
    // Handle actions from menu-item elements
    switch (action) {
      case "import-psbt-file":
        this.handleImportPSBTFile();
        break;
      case "process-manual-entry":
        this.handleManualEntry();
        break;
      case "sign-psbt":
        this.handleSignPSBT();
        break;
      case "cancel-psbt":
        this.reset();
        break;
      case "done-psbt":
        this.handleDone();
        break;
      case "show-full-address":
        this.handleShowFullAddress();
        break;
    }
  },

  handleShowFullAddress: function () {
    var root = document.getElementById(this.id);
    if (!root) return;
    var focused = root.querySelector(".tx-output-item.focused");
    if (!focused) return;
    var address = focused.getAttribute("data-address");
    if (address) {
      alert(address);
    }
  },

  /**
   * Handle PSBT file import from SD card
   * Uses Web Activities API on KaiOS to launch native File Manager
   */
  handleImportPSBTFile: function () {
    var self = this;

    // Hide any previous errors
    this.hideError();

    // Debug: Log available APIs
    console.log("MozActivity available:", typeof MozActivity !== "undefined");
    console.log(
      "navigator.getDeviceStorages available:",
      typeof navigator.getDeviceStorages === "function"
    );

    // Try Device Storage API first (direct SD card access)
    // Note: Use getDeviceStorages (plural) to access all volumes (Internal + SD Card)
    // Note: This is async, so if it fails, we'll fall through to Web Activities
    if (typeof navigator.getDeviceStorages === "function") {
      try {
        var deviceStorageStarted = this.handleImportViaDeviceStorage(
          function () {
            // Callback when Device Storage fails - trigger Web Activities
            console.log("Device Storage failed, trying Web Activities");
            self.tryWebActivities();
          }
        );
        // Device Storage API is async, so we can't wait for results
        // If it successfully starts, it will handle the file reading
        // If it fails, the callback will trigger Web Activities
        if (deviceStorageStarted) {
          // Device Storage started - it will either succeed or call the fallback callback
          return;
        }
      } catch (error) {
        console.error("Device Storage API error:", error);
        // Continue to try Web Activities
      }
    }

    // If Device Storage is not available or failed, try Web Activities
    this.tryWebActivities();
  },

  /**
   * Try Web Activities API to launch native File Manager
   */
  tryWebActivities: function () {
    var self = this;

    // Try Web Activities API (KaiOS native File Manager)
    if (typeof MozActivity === "undefined") {
      console.log("MozActivity not available, using HTML file input");
      // Fallback to HTML file input for non-KaiOS or if Web Activities not available
      this.fallbackToHTMLFileInput();
      return;
    }

    try {
      // Try multiple activity configurations
      var activityConfigs = [
        {
          name: "pick",
          data: {
            type: ["file/*"],
          },
        },
        {
          name: "pick",
          data: {
            type: "file/*",
          },
        },
        {
          name: "pick",
          data: {
            type: ["*/*"],
          },
        },
      ];

      var tryActivity = function (configIndex) {
        if (configIndex >= activityConfigs.length) {
          console.error(
            "All activity configurations failed, falling back to HTML input"
          );
          self.fallbackToHTMLFileInput();
          return;
        }

        var config = activityConfigs[configIndex];
        console.log("Trying activity config:", configIndex, config);

        try {
          var activity = new MozActivity(config);

          activity.onsuccess = function () {
            console.log("Activity success, result:", activity.result);
            // Get the file from the activity result
            var result = activity.result;
            var blob = null;
            var fileName = "psbt.psbt";

            if (!result) {
              self.showError("No file selected.");
              return;
            }

            // Try different result structures
            if (result.blob) {
              blob = result.blob;
              fileName = result.name || fileName;
            } else if (result instanceof Blob) {
              blob = result;
              fileName = result.name || fileName;
            } else if (result.file) {
              blob = result.file;
              fileName = result.file.name || fileName;
            } else {
              console.log("Activity result structure:", result);
              self.showError("Unexpected file format. Please try again.");
              return;
            }

            if (!blob) {
              self.showError("No file data received.");
              return;
            }

            // Check file extension
            if (!fileName.toLowerCase().endsWith(".psbt")) {
              self.showError("Invalid file type. Please select a .psbt file.");
              return;
            }

            // Read file content
            var reader = new FileReader();
            reader.onload = function (e) {
              try {
                var fileContent = e.target.result;

                // PSBT files from Blue Wallet are base64 encoded
                // Remove any whitespace/newlines
                var psbtString = fileContent.trim().replace(/\s/g, "");

                if (!psbtString) {
                  self.showError("File is empty or invalid.");
                  return;
                }

                // Hide any previous errors
                self.hideError();

                // Process the PSBT
                // Try parsing as base64 PSBT first (most common format)
                try {
                  self.psbt = PSBTService.parsePSBT(psbtString);

                  // Get transaction info
                  var txInfo = PSBTService.getTransactionInfo(self.psbt);

                  // Show review state
                  self.showReviewState(txInfo);
                } catch (parseError) {
                  // If base64 parsing fails, try as UR format
                  self.processPSBTString(psbtString);
                }
              } catch (error) {
                self.showError("Failed to read PSBT file: " + error.message);
                console.error("File read error:", error);
              }
            };

            reader.onerror = function (error) {
              self.showError("Failed to read file: " + error.message);
              console.error("FileReader error:", error);
            };

            // Read file as text (PSBT files are base64 text)
            reader.readAsText(blob);
          };

          activity.onerror = function (error) {
            console.error(
              "Activity launch error (config " + configIndex + "):",
              error
            );
            // Try next configuration
            tryActivity(configIndex + 1);
          };
        } catch (error) {
          console.error(
            "Error creating activity (config " + configIndex + "):",
            error
          );
          // Try next configuration
          tryActivity(configIndex + 1);
        }
      };

      // Start with first configuration
      tryActivity(0);
    } catch (error) {
      console.error("Error in activity launch:", error);
      // Fallback to HTML file input if Web Activities fails
      this.fallbackToHTMLFileInput();
    }
  },

  /**
   * Handle file import using Device Storage API (direct SD card access)
   * Scans ALL storage volumes (Internal + SD Card)
   * Based on senior dev guidance: uses getDeviceStorages (plural) to access all volumes
   * @param {Function} onError - Callback to call when Device Storage fails
   * @returns {boolean} true if Device Storage API was successfully used, false otherwise
   */
  handleImportViaDeviceStorage: function (onError) {
    var self = this;

    // 1. Check API availability (plural version)
    if (!navigator.getDeviceStorages) {
      console.log("Device Storage API (plural) not supported");
      if (onError) onError();
      return false;
    }

    // 2. Get ALL storage volumes (Internal + External)
    // On KaiOS, "sdcard" is the storage name for both internal and external storage
    var storages = navigator.getDeviceStorages("sdcard");

    if (!storages || storages.length === 0) {
      console.log("No storage volumes found");
      if (onError) onError();
      return false;
    }

    this.showError("Scanning storage for .psbt files...");

    var psbtFiles = [];
    var pendingCursors = storages.length;
    var usbMassStorageDetected = false;

    // 3. Define the completion handler
    var checkCompletion = function () {
      pendingCursors--;
      if (pendingCursors > 0) return; // Wait for other volumes

      // All volumes scanned
      if (psbtFiles.length > 0) {
        console.log("Found " + psbtFiles.length + " PSBT files");

        // If we found files, hide the "Scanning" message
        self.hideError();

        if (psbtFiles.length === 1) {
          self.readPSBTFile(psbtFiles[0].file);
        } else {
          // TODO: Ideally show a picker list here.
          // For now, prioritize the one from the physical SD card if possible, or just the first one.
          self.readPSBTFile(psbtFiles[0].file);
          // Optional: You could notify user there were multiple files
          // alert("Multiple PSBT files found. Opening: " + psbtFiles[0].name);
        }
      } else {
        // No files found
        if (usbMassStorageDetected) {
          self.showError(
            "⚠️ USB Storage Detected!\n\n" +
              "Please UNPLUG your USB cable or disable USB Storage in Settings to access the SD card."
          );
        } else {
          console.log("No .psbt files found on any volume");
          // Only fall back to WebActivities if we didn't find files AND didn't see the USB error
          if (onError) onError();
        }
      }
    };

    // 4. Iterate over every volume found
    for (var i = 0; i < storages.length; i++) {
      (function () {
        // Create closure to capture storage and storageName
        var storage = storages[i];
        var storageName = storage.storageName || "unknown"; // e.g., "sdcard", "internal"
        console.log("Scanning volume: " + storageName);

        // Check if storage is available (if supported by this Gecko version)
        if (storage.available === false) {
          console.warn("Volume " + storageName + " is unmounted/unavailable");
          checkCompletion();
          return;
        }

        try {
          var cursor = storage.enumerate();

          cursor.onsuccess = function () {
            if (this.result) {
              var file = this.result;
              // Case-insensitive check for .psbt extension
              if (file.name && file.name.toLowerCase().endsWith(".psbt")) {
                console.log("Found PSBT: " + file.name + " on " + storageName);
                psbtFiles.push({
                  name: file.name,
                  file: file,
                  storageName: storageName,
                });
              }
              this.continue();
            } else {
              // Enumeration finished for this volume
              checkCompletion();
            }
          };

          cursor.onerror = function () {
            var errorName = this.error ? this.error.name : "Unknown";
            console.warn(
              "Error scanning volume " + storageName + ": " + errorName
            );

            // "NotFoundError" usually means the volume is mounted to the PC via USB
            if (errorName === "NotFoundError") {
              usbMassStorageDetected = true;
            }

            checkCompletion();
          };
        } catch (e) {
          console.error("Crash scanning volume " + storageName, e);
          checkCompletion();
        }
      })();
    }

    return true; // We successfully initiated the scan
  },

  // Removed waitForPSBTLibraries - no longer needed with alternative PSBT service
  // The alternative service uses only bitcoinjs-lib which is already loaded

  /**
   * Read and process a PSBT file
   */
  readPSBTFile: function (file) {
    var self = this;

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var fileContent = e.target.result;

        // PSBT files from Blue Wallet are base64 encoded
        // Remove any whitespace/newlines
        var psbtString = fileContent.trim().replace(/\s/g, "");

        if (!psbtString) {
          self.showError("File is empty or invalid.");
          return;
        }

        // Hide any previous errors
        self.hideError();

        // Process the PSBT directly (no library loading needed)
        self.hideError();

        // Process the PSBT
        // Use alternative service (no external libraries needed)
        try {
          var psbtService =
            typeof PSBTServiceAlternative !== "undefined"
              ? PSBTServiceAlternative
              : PSBTService;
          self.psbt = psbtService.parsePSBT(psbtString);

          // Get transaction info
          var txInfo = psbtService.getTransactionInfo(self.psbt);

          // Show review state
          self.showReviewState(txInfo);
        } catch (parseError) {
          self.showError("Failed to parse PSBT:\n" + parseError.message);
          console.error("PSBT Parse Error:", parseError);
        }
      } catch (error) {
        self.showError("Failed to read PSBT file: " + error.message);
        console.error("File read error:", error);
      }
    };

    reader.onerror = function (error) {
      self.showError("Failed to read file: " + error.message);
      console.error("FileReader error:", error);
    };

    // Read file as text (PSBT files are base64 text)
    reader.readAsText(file);
  },

  /**
   * Fallback to HTML file input (for testing or non-KaiOS devices)
   */
  fallbackToHTMLFileInput: function () {
    var root = document.getElementById(this.id);
    var fileInput = root.querySelector("#psbt-file-input");
    if (!fileInput) return;

    var self = this;

    // Set up file change handler
    fileInput.onchange = function (event) {
      var file = event.target.files[0];
      if (!file) {
        return;
      }

      // Check file extension
      if (!file.name.toLowerCase().endsWith(".psbt")) {
        self.showError("Invalid file type. Please select a .psbt file.");
        // Reset file input
        fileInput.value = "";
        return;
      }

      // Read file content
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var fileContent = e.target.result;

          // PSBT files from Blue Wallet are base64 encoded
          // Remove any whitespace/newlines
          var psbtString = fileContent.trim().replace(/\s/g, "");

          if (!psbtString) {
            self.showError("File is empty or invalid.");
            return;
          }

          // Hide any previous errors
          self.hideError();

          // Process the PSBT
          // Try parsing as base64 PSBT first (most common format)
          try {
            // Use alternative service
            var psbtService =
              typeof PSBTServiceAlternative !== "undefined"
                ? PSBTServiceAlternative
                : PSBTService;
            self.psbt = psbtService.parsePSBT(psbtString);

            // Get transaction info
            var txInfo = psbtService.getTransactionInfo(self.psbt);

            // Show review state
            self.showReviewState(txInfo);
          } catch (parseError) {
            // If base64 parsing fails, try as UR format
            self.processPSBTString(psbtString);
          }
        } catch (error) {
          self.showError("Failed to read PSBT file: " + error.message);
          console.error("File read error:", error);
        }

        // Reset file input for next use
        fileInput.value = "";
      };

      reader.onerror = function (error) {
        self.showError("Failed to read file: " + error.message);
        console.error("FileReader error:", error);
        fileInput.value = "";
      };

      // Read file as text (PSBT files are base64 text)
      reader.readAsText(file);
    };

    // Trigger file picker
    fileInput.click();
  },

  /**
   * Handle manual base64 PSBT entry
   */
  handleManualEntry: function () {
    var root = document.getElementById(this.id);
    var input = root.querySelector("#manual-ur-input");
    if (!input) return;

    var psbtText = input.value.trim();
    if (!psbtText) {
      this.showError("Please enter a base64 PSBT");
      return;
    }

    // Check if user tried to enter UR format
    if (psbtText.startsWith("UR:") || psbtText.startsWith("CRYPTO-PSBT/")) {
      this.showError(
        "UR format not supported.\n\n" +
          "Please use base64 PSBT format.\n" +
          "You can export base64 PSBT from Blue Wallet or other wallets."
      );
      return;
    }

    // Process the base64 PSBT
    this.processPSBTString(psbtText);

    // Clear input after processing
    input.value = "";
  },

  updateSoftkeys: function () {
    var centerSoftkey = document.getElementById("softkey-center");
    if (!centerSoftkey) return;

    var focusIndex = Navigation.getFocusIndex();
    var root = document.getElementById(this.id);
    if (!root) return;

    var focusableItems = root.querySelectorAll(".menu-item, .focusable");

    // Show SELECT when a focusable item is focused
    if (
      focusableItems.length > 0 &&
      focusIndex >= 0 &&
      focusIndex < focusableItems.length
    ) {
      centerSoftkey.textContent = "SELECT";
      centerSoftkey.style.color = "#000000";
      centerSoftkey.style.fontWeight = "bold";
    } else {
      centerSoftkey.textContent = "";
    }
  },

  handleBack: function () {
    if (this.currentState === "scanning") {
      App.showScreen("home");
    } else {
      this.reset();
    }
  },
};
