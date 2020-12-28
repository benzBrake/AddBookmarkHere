if (typeof browser !== 'undefined') {
    chrome = browser
}
function saveOptions () {
  browser.storage.local.set({
    defaultBookmarkPosition: document.querySelector("input[name=BTH_atFolder]:checked").value,
    bookmarkAllTabs: document.querySelector("input[name=BTH_bookmarkAllTabs]").checked,
    editorWin: document.querySelector("input[name=BTH_UI]:checked").value
  });
}

function restoreOptions () {
  var gettingSavedOptions = browser.storage.local.get(["defaultBookmarkPosition", "bookmarkAllTabs", "editorWin"]);
  gettingSavedOptions.then(setCurrentOptions);

  function setCurrentOptions (result) {
    var id = (result.defaultBookmarkPosition == "bottom") ? "BTHfolderBottom" : "BTHfolderTop";
    document.getElementById(id).checked = true;

    id = (result.editorWin == "all") ? "BTHall" : "BTHctrl";
    document.getElementById(id).checked = true;

    if (result.bookmarkAllTabs) {
      document.getElementById("BTH_allTabs").checked = "true";
    }
  }
}

var ids = ["BTHfolderTop", "BTHfolderBottom", "BTH_allTabs", "BTHctrl", "BTHall"];
ids.forEach(id => {
  document.getElementById(id).addEventListener("click", saveOptions);
});

document.addEventListener("DOMContentLoaded", restoreOptions);
// i18n
document.getElementById('BTHLG1').innerHTML = chrome.i18n.getMessage("BTHLG1");
document.querySelector("label[for='BTHfolderTop']").textContent = chrome.i18n.getMessage("BTHfolderTop");
document.querySelector("label[for='BTHfolderBottom']").textContent = chrome.i18n.getMessage("BTHfolderBottom");
document.querySelector("label[for='BTH_allTabs']").innerHTML = chrome.i18n.getMessage("BTH_allTabs");
document.getElementById('BTHLG2').innerHTML = chrome.i18n.getMessage("BTHLG2");
document.querySelector("label[for='BTHctrl']").textContent = chrome.i18n.getMessage("BTHctrl");
document.querySelector("label[for='BTHall']").textContent = chrome.i18n.getMessage("BTHall");