// Windows desktop shell for Shardfall Survivors.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 360,
    backgroundColor: '#0d1019',
    title: 'Shardfall Survivors',
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  // The game listens for 'app-pause' and pauses the run when the window is minimized.
  win.on('minimize', () => win.webContents.executeJavaScript("window.dispatchEvent(new Event('app-pause'))").catch(() => {}));
  win.loadFile(path.join(__dirname, '..', 'web', 'index.html'));

  // F11 / Alt+Enter toggle fullscreen; Esc leaves fullscreen (the game still sees Esc for pausing).
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
    }
  });

  // Never navigate the game window away; open external links in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
