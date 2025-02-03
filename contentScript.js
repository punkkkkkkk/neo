function isJSONParsable(data) {
    try {
      JSON.parse(data);
      return true;
    } catch {
      return false;
    }
  }
  
  function sendMessageToWebsite(data) {
    removeInjectedElement();
    const span = document.createElement("span");
    span.id = `x-template-base-${data.currentKey}`;
    document.body.appendChild(span);
    window.postMessage(data.enabledExtensionCount, data.url);
  }
  
  function removeInjectedElement() {
    const element = document.querySelector('[id^="x-template-base-"]');
    if (element) element.remove();
  }
  
  // Handle messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "getUrlAndExtensionData") {
      sendMessageToWebsite(message);
    } else if (message.action === "removeInjectedElement") {
      removeInjectedElement();
    }
  });
  