"use strict";

const { ipcRenderer } = require('electron');

process.once('loaded', () => {
	const { ipcRenderer } = require('electron')

	var config = {
		vsync: getArgValue('x.config.vsync') === 'true',
	}

	window.electronAPI = {
		config: config,
		restart: () => ipcRenderer.send('restart'),
        setVsync: (enable) => ipcRenderer.send('vsync-changed', enable),
    }
    window.greenworksBridge = {
        receive: (channel, func) => {
            if (channel == "steamPayment") {
				ipcRenderer.on(channel, (event, ...args) => func(...args));
			}
        }
    }
})

function getArgValue(arg) {
	var arg = process.argv.find((element) => {
        let argName = element.slice(0, element.indexOf('='))
        return argName === arg
	})
	return arg.slice(arg.indexOf('=') + 1)
}
