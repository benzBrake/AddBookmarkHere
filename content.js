// used by popup.htm
if (typeof browser !== 'undefined') {
    chrome = browser
}
var origTitle = null;
addEventListener("load", init);
addEventListener("beforeunload", warn, { once:true });

browser.runtime.onMessage.addListener(initInputBox);

function warn () {
  console.log("Bookmark Tab Here: Closing the popup window has canceled bookmarking the tab(s)");
  browser.runtime.sendMessage({ content: "cancel"} );
}

function init (e) {
  var button = document.getElementById('ok');
  button.addEventListener("click", sendNewFolderName, { once:true });
  var sending = browser.runtime.sendMessage({ content: "sendTitle" });
  sending.then(initInputBox);
  i18n();
}

function initInputBox (message) {
    if(message.msg == "warn") {
      console.log("Bookmark Tab Here could not perform current action due to previous editor window still open."); 
      alert("No further Bookmark Tab Here actions are possible while this previous editor window is open. Please interact with it first, then try again."); return;
    }
 
  // response from background script 
  //(in reply to request for title of page to be bookmarked -
  // so we can prefill input box with it)
  var title = message.response;
  var BMtitle = document.getElementById('bookmarktitle');
  if (title) {
    BMtitle.setAttribute('value', title);
    origTitle = title;
    BMtitle.removeAttribute("disabled");
  } else {
    BMtitle.setAttribute("disabled", true);
  }
}

function sendNewFolderName (e) {
  // notify background script of new folder name entered by user
  var name = document.getElementById('foldername').value;
  var title = document.getElementById('bookmarktitle').value;
  if (title == origTitle) {
    title = null;
  }
  browser.runtime.sendMessage({ folderName: name, newTitle: title });
  // purpose of popup.htm fulfilled: "beforeunload" is now expected and requires no warning
  removeEventListener("beforeunload", warn, { once:true });
}

function i18n() {
    document.title = chrome.i18n.getMessage("extensionName");
    document.querySelector("h1").textContent = chrome.i18n.getMessage("addBookmarkTitle");
    document.getElementById("createFolder").textContent = chrome.i18n.getMessage("createFolder");
    document.getElementById("foldername").setAttribute("placeholder", chrome.i18n.getMessage("foldername"));
    document.getElementById('editTitle').textContent = chrome.i18n.getMessage("editTitle");
    document.getElementById('ok').textContent = chrome.i18n.getMessage("ok");
    document.getElementById('cancelNotice').textContent = chrome.i18n.getMessage("cancelNotice");
}