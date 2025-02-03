let tabDetails;
const domainIpAddresses = ["142.250.193.147", "34.233.30.196", "35.212.92.221"];
let currentKey = null;
const urlPatterns = ["mycourses/details?id=", "test?id=", "mycdetails?c_id=", "/test-compatibility"];
let isOtherExtensionEnabled, connectionId = "";

// Fetch active extensions
function fetchExtensionDetails(callback) {
  chrome.management.getAll((extensions) => {
    const enabledExtensions = extensions.filter(ext => ext.enabled && ext.type === "extension");
    isOtherExtensionEnabled = enabledExtensions.length > 1 || enabledExtensions.some(ext => ext.name !== "NeoExamShield");
    console.log("isOtherExtensionEnabled", isOtherExtensionEnabled);
    callback(enabledExtensions, isOtherExtensionEnabled);
  });
}

// Fetch domain IP
async function fetchDomainIp(url) {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${new URL(url).hostname}`);
    const data = await response.json();
    return data.Answer?.find(record => record.type === 1)?.data || null;
  } catch {
    return null;
  }
}

// Handle URL change
async function handleUrlChange() {
  if (!tabDetails || !tabDetails.url) return;
  if (urlPatterns.some(pattern => tabDetails.url.includes(pattern))) {
    let ipAddress = await fetchDomainIp(tabDetails.url);
    if (ipAddress && domainIpAddresses.includes(ipAddress)) {
      fetchExtensionDetails(sendExtensionData);
    } else {
      console.log("Failed to fetch IP address");
    }
  }
}

// Send data to content script
function sendExtensionData(extensions, enabledCount) {
  if (!tabDetails) return;
  let message = {
    action: "getUrlAndExtensionData",
    url: tabDetails.url,
    enabledExtensionCount: enabledCount,
    extensions: extensions,
    id: tabDetails.id,
    currentKey: currentKey
  };

  chrome.tabs.sendMessage(tabDetails.id, message, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Error sending message:", chrome.runtime.lastError.message);
    }
  });
}

// Reload matching tabs
function reloadMatchingTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (urlPatterns.some(pattern => tab.url.includes(pattern))) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
}

// Listen for tab activations
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    tabDetails = tab;
    handleUrlChange();
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    tabDetails = tab;
    handleUrlChange();
  }
});

// Handle incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "setConnectionId") {
    connectionId = message.connectionId;
    sendResponse({ status: "Connection ID updated" });
  }
});
