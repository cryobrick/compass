/**
 * Compass - KaiOS D-pad Navigation
 * Handles arrow keys, enter, back, and soft keys
 */

var Navigation = (function () {
  var currentScreen = null;
  var focusIndex = 0;
  var focusableItems = [];

  // Event callbacks
  var onSelect = null;
  var onBack = null;
  var onSoftLeft = null;
  var onSoftRight = null;
  var onFocusChange = null; // Callback when focus changes

  function init() {
    document.addEventListener("keydown", handleKeyDown);
  }

  function handleKeyDown(e) {
    // Check if user is typing in an input field
    var activeElement = document.activeElement;
    var isTyping =
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable);

    switch (e.key) {
      case "ArrowUp":
        // Only prevent default if not typing (allow cursor movement in inputs)
        if (!isTyping) {
          e.preventDefault();
          moveFocus(-1);
        }
        break;
      case "ArrowDown":
        // Only prevent default if not typing (allow cursor movement in inputs)
        if (!isTyping) {
          e.preventDefault();
          moveFocus(1);
        }
        break;
      case "Enter":
        // Only prevent default if not typing (allow Enter in inputs)
        if (!isTyping) {
          e.preventDefault();
          selectCurrent();
        }
        break;
      case "Backspace":
        // When typing in an input, let Backspace delete text normally
        if (isTyping) break;
        e.preventDefault();
        if (onBack) onBack();
        break;
      case "Escape":
      case "EndCall":
      case "BrowserBack":
        // Blur any focused input before navigating back
        if (isTyping && activeElement) {
          activeElement.blur();
        }
        e.preventDefault();
        if (onBack) onBack();
        break;
      case "SoftLeft":
        e.preventDefault();
        if (onSoftLeft) onSoftLeft();
        break;
      case "SoftRight":
        e.preventDefault();
        if (onSoftRight) onSoftRight();
        break;
      case "q":
      case "Q":
        // Only intercept if not typing in an input
        if (!isTyping) {
          e.preventDefault();
          if (onSoftLeft) onSoftLeft();
        }
        break;
      case "e":
      case "E":
        // Only intercept if not typing in an input
        if (!isTyping) {
          e.preventDefault();
          if (onSoftRight) onSoftRight();
        }
        break;
    }
  }

  function moveFocus(direction) {
    if (focusableItems.length === 0) return;

    // If current item is an input that has actual focus, blur it first
    var currentItem = focusableItems[focusIndex];
    if (
      currentItem &&
      currentItem.tagName === "INPUT" &&
      document.activeElement === currentItem
    ) {
      currentItem.blur();
    }

    // Remove focus from current
    if (focusableItems[focusIndex]) {
      focusableItems[focusIndex].classList.remove("focused");
    }

    // Calculate new index
    focusIndex += direction;
    if (focusIndex < 0) focusIndex = 0;
    if (focusIndex >= focusableItems.length)
      focusIndex = focusableItems.length - 1;

    // Add focus to new
    if (focusableItems[focusIndex]) {
      focusableItems[focusIndex].classList.add("focused");

      // Scroll into view - ensure it scrolls within the screen-content container
      var screen = document.getElementById(currentScreen);
      var screenContent = screen
        ? screen.querySelector(".screen-content")
        : null;
      if (screenContent) {
        var item = focusableItems[focusIndex];
        var itemTop = 0;
        var el = item;
        while (el && el !== screenContent) {
          itemTop += el.offsetTop;
          el = el.offsetParent;
        }
        var itemHeight = item.offsetHeight;
        var containerTop = screenContent.scrollTop;
        var containerHeight = screenContent.clientHeight;

        // Scroll if item is above visible area
        if (itemTop < containerTop) {
          screenContent.scrollTop = itemTop - 8; // 8px padding
        }
        // Scroll if item is below visible area
        else if (itemTop + itemHeight > containerTop + containerHeight) {
          screenContent.scrollTop = itemTop + itemHeight - containerHeight + 8;
        }
      } else {
        // Fallback to default scrollIntoView
        focusableItems[focusIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }

      // Notify focus change
      if (onFocusChange) {
        onFocusChange(focusIndex);
      }
    }
  }

  function selectCurrent() {
    if (focusableItems[focusIndex] && onSelect) {
      var action = focusableItems[focusIndex].getAttribute("data-action");
      onSelect(action, focusIndex);
    }
  }

  function setScreen(screenId) {
    // Hide all screens
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove("active");
    }

    // Show target screen
    var screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add("active");
      currentScreen = screenId;

      // Refresh focusable items
      refreshFocusableItems();
    }
  }

  function refreshFocusableItems() {
    // Find focusable items in current screen
    var screen = document.getElementById(currentScreen);
    if (!screen) return;

    // Clear old focus
    for (var i = 0; i < focusableItems.length; i++) {
      focusableItems[i].classList.remove("focused");
    }

    // Find new focusable items - ensure we get them in DOM order
    // First get all .focusable items, then all .menu-item items
    // Filter out items hidden by a parent with display:none
    var focusable = Array.from(screen.querySelectorAll(".focusable"));
    var menuItems = Array.from(screen.querySelectorAll(".menu-item"));
    var allItems = focusable.concat(menuItems);
    focusableItems = allItems.filter(function (el) {
      return el.offsetParent !== null;
    });

    // If we had a valid focus index before, try to maintain it
    // Otherwise reset to 0
    if (focusIndex >= focusableItems.length) {
      focusIndex = 0;
    }

    // Set initial focus
    if (focusableItems.length > 0) {
      focusableItems[focusIndex].classList.add("focused");
      // Notify focus change
      if (onFocusChange) {
        onFocusChange(focusIndex);
      }
    }
  }

  function setCallbacks(callbacks) {
    onSelect = callbacks.onSelect || null;
    onBack = callbacks.onBack || null;
    onSoftLeft = callbacks.onSoftLeft || null;
    onSoftRight = callbacks.onSoftRight || null;
    onFocusChange = callbacks.onFocusChange || null;
  }

  function getCurrentScreen() {
    return currentScreen;
  }

  function getFocusIndex() {
    return focusIndex;
  }

  function setFocusIndex(index) {
    if (index >= 0 && index < focusableItems.length) {
      // Remove focus from current
      if (focusableItems[focusIndex]) {
        focusableItems[focusIndex].classList.remove("focused");
      }
      // Set new index
      focusIndex = index;
      // Add focus to new
      if (focusableItems[focusIndex]) {
        focusableItems[focusIndex].classList.add("focused");
        // Notify focus change
        if (onFocusChange) {
          onFocusChange(focusIndex);
        }
      }
    }
  }

  // Public API
  return {
    init: init,
    setScreen: setScreen,
    setCallbacks: setCallbacks,
    refreshFocusableItems: refreshFocusableItems,
    getCurrentScreen: getCurrentScreen,
    getFocusIndex: getFocusIndex,
    setFocusIndex: setFocusIndex,
  };
})();
