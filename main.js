// filepath: c:\Users\Ignas\BookDatabase\main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Preload script
            contextIsolation: true, // Enable context isolation
            nodeIntegration: false, // Disable Node.js integration for security
        },
    });

    // Load your web app's main HTML file
    mainWindow.loadFile(path.join(__dirname, 'public', 'login.html')); // Ensure correct path

    // Open Developer Tools
    mainWindow.webContents.openDevTools();
});

// Log messages from the renderer process
ipcMain.on("log", (event, message) => {
    console.log("[Renderer Log]:", message);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});