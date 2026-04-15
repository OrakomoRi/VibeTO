"use strict";

const { app, BrowserWindow, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');
const isOnline = require('is-online');

function createGameWindow(loadURL, dev, vsync) {
	console.log(`createGameWindow standalone dev=${dev} vsync=${vsync} url=${loadURL}`)

	let gameWindow = new BrowserWindow({
		width: 1024,
		height: 1024,
		show: true,
		fullscreenable: true,
		frame: true,
		toolbar: true,
		backgroundColor: '#001926',
		webPreferences: {
			preload: path.resolve(__dirname, 'preload.js'),
			contextIsolation: false,
			nodeIntegration: false, // без этого не будут работать некоторые платежные методы (Нидерланды -> Visa)
			nativeWindowOpen: true, // без этого не будут работать google и facebook авторизация
			additionalArguments: [
                `x.config.vsync=${vsync}`,
            ],
		}
	});
    waitInternetBeforeLoadGame(gameWindow, loadURL, dev, vsync)
}

function waitInternetBeforeLoadGame(gameWindow, loadURL, dev, vsync) {
	console.log("Check internet connection");
    isOnline().then(online => {
        if (online) {
            console.log("Connected to internet");
            loadGame(gameWindow, loadURL, dev, vsync)
        } else {
            gameWindow.loadURL(`file://${__dirname}/../index.html`)
            waitInternetBeforeLoadGame(gameWindow, loadURL, dev, vsync)
        }
    });
}

function loadGame(gameWindow, loadURL, dev, vsync) {
    const url = loadURL + '&client=electron'
    gameWindow.loadURL(url)
    gameWindow.maximize()
    if (dev) {
        gameWindow.webContents.openDevTools();
    }
    gameWindow.on('enter-html-full-screen', () => {
        gameWindow.setFullScreen(true);
    });
    gameWindow.on('leave-html-full-screen', () => {
        gameWindow.setFullScreen(false);
    });
    app.on('browser-window-focus', () => {
        globalShortcut.register('CommandOrControl+R', () => {
            gameWindow.reload()
        })
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            if (gameWindow.webContents.isDevToolsOpened()) {
                gameWindow.webContents.closeDevTools()
            } else {
                gameWindow.webContents.openDevTools()
            }
        })
    })
    app.on('browser-window-blur', () => {
        globalShortcut.unregisterAll()
    })
}

module.exports = {
  createGameWindow,
};
