var defaultToTop = true;
var bookmarkAllTabsEnabled = false;
var alwaysShowEditor = false;
var editorPopup = null;

// Create BTH context menu item
browser.menus.create({
  id: "BTH",
  title: browser.i18n.getMessage("BTH_menuitemText"),
  contexts: ["bookmark"]
});

// Obtain our options initial settings
var getSettings = browser.storage.local.get(["defaultBookmarkPosition", "bookmarkAllTabs", "editorWin"]);
getSettings.then(result => {
  // defaultBookmarkPosition will be undefined if value not previously stored
  if (result.defaultBookmarkPosition && result.defaultBookmarkPosition == "bottom") {
    defaultToTop = false;
  }
  if (result.editorWin == "all") {
    alwaysShowEditor = true;
  }
  bookmarkAllTabsEnabled = Boolean(result.bookmarkAllTabs); // if value not previously stored, undefined->false
});

// el called when BTH contextmenu entry is clicked
browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId != "BTH")
    return;
  // available in Fx64+  Bug1469148   https://hg.mozilla.org/integration/autoland/rev/b2a53a75ba3d48968e209bc679fb744c3280d666
  // console.log("button clicked is: " + info.button);
  if (editorPopup) {
    // if our previous editor window is still open, trigger alert and focus popup
    // we must block further actions to avoid destroying previous bookmarking info
    editorPopup.then(win => {
      browser.tabs.sendMessage(win.tabs[0].id, {msg: "warn"});
      browser.windows.update(win.id, {focused: true});
    });
  } else {
    bookmarkTabs(info.bookmarkId, info.modifiers);
  }
});

function addBookmarks (tabs, index, folder, newTitle) {
  var name = null;
  if (newTitle && tabs.length == 1) {
    name = newTitle;
  }
  tabs.reverse();
  tabs.forEach(tab => {
    var bookmarkName = name || tab.title; // non-null name implies tabs.length == 1
    browser.bookmarks.create({index: index, parentId: folder, title: bookmarkName, url: tab.url});
  });
}

function getTabs (which) {
  // Fx 63+ supports multiselected (highlighted) tabs; previously highlighted was alias for active tab
  var queryObj = (which == "selected") ? {highlighted: true, currentWindow: true} : {currentWindow: true};
  return browser.tabs.query(queryObj);
}

function getIndex (menuitem, bookmarkTreeNode) {
  if (bookmarkTreeNode.type != "folder") { // contextmenu of a menuitem
    // bookmark should be set below selected menuitem
    return bookmarkTreeNode.index + 1;
  } else { // contextmenu of a folder
    // set bookmark at top/bottom of menu depending on option
    return (defaultToTop) ? 0 : bookmarkTreeNode.children.length;
  }
}

function openEditorPopup () {
  editorPopup = browser.windows.create({
    url: "/popup.htm",
    type: "popup",
    width: 500,
    height: 320
  });
}

async function bookmarkTabs (menuitem, modif) {
  var ShiftKey = modif.includes('Shift');
  var showEditor = alwaysShowEditor || modif.includes('Ctrl');
  var gettingTabs = (ShiftKey && bookmarkAllTabsEnabled) ? getTabs("all") : getTabs("selected");
  var obtainingTree = browser.bookmarks.getSubTree(menuitem);
  var gettingInfo = await Promise.all([obtainingTree, gettingTabs]);

  var tabs = gettingInfo[1];
  var title = (tabs.length == 1) ? tabs[0].title : ""; // title will not be editable if > 1 tab to bookmark
  if (showEditor) { // user wants to specify details of bookmark (new folder/rename)
    openEditorPopup(); // do ASAP to avoid lag, but need title available for content script's request
  }
  var node = gettingInfo[0];
  var bookmarkTreeNode = node[0]; // see BookmarkTreeNodeType
  var folder = (bookmarkTreeNode.type == "folder") ? menuitem : bookmarkTreeNode.parentId;
  var index = getIndex(menuitem, bookmarkTreeNode);
  if (!showEditor) { // showEditor processing finishes after getting user input
    addBookmarks(tabs, index, folder, null);
    return;
  }
  function contentMsgHandler (request, sender, sendResponse) {
    var req = request.content;
    switch (req) {
      case "sendTitle":
        sendResponse({response: title});
        break;
      case "cancel":
        browser.runtime.onMessage.removeListener(contentMsgHandler);
        editorPopup = null;
        break;
      default:
        var foldername = request.folderName;
        var newTitle = request.newTitle;
        browser.windows.remove(sender.tab.windowId); // close created UI window
        editorPopup = null;
        createEditedBookmarks(index, folder, foldername, newTitle, tabs);
        browser.runtime.onMessage.removeListener(contentMsgHandler);
    }
  }
  browser.runtime.onMessage.addListener(contentMsgHandler);
}

async function createEditedBookmarks (index, folder, foldername, newTitle, tabs) {
  var folderId;
  if (foldername) { // user wants items bookmarked into a new folder
    // create the requested new folder
    var createBookmarkFolder = browser.bookmarks.create({
      index: index,
      parentId: folder,
      title: foldername
    });
    var newFolder = await createBookmarkFolder;
    folderId = newFolder.id;
  }
  folderId = (foldername) ? newFolder.id : folder;
  addBookmarks(tabs, index, folderId, newTitle);
}

browser.storage.onChanged.addListener(updateOptions);

function updateOptions (changes) {
  defaultToTop = changes.defaultBookmarkPosition.newValue != "bottom";
  alwaysShowEditor = changes.editorWin.newValue == "all";
  bookmarkAllTabsEnabled = changes.bookmarkAllTabs.newValue;
}
