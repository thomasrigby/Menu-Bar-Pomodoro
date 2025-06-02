const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {

})

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        ipcRenderer: {
            invoke: (channel, data) => {
                const validChannels = [
                    'get-pomodoro-stats',
                    'get-average-stats',
                    'get-productivity-hours',
                    'get-graph-data',
                    'log-pomodoro-session',
                    'start-timer',
                    'pause-timer',
                    'get-timer-state'
                ];
                if (validChannels.includes(channel)) {
                    return ipcRenderer.invoke(channel, data);
                }
                return Promise.reject(new Error('Invalid channel'));
            },
            on: (channel, func) => {
                const validChannels = ['timer-tick', 'timer-complete', 'timer-paused', 'play-sound'];
                if (validChannels.includes(channel)) {
                    ipcRenderer.on(channel, (event, ...args) => func(...args));
                }
            },
            removeListener: (channel, func) => {
                const validChannels = ['timer-tick', 'timer-complete', 'timer-paused', 'play-sound'];
                if (validChannels.includes(channel)) {
                    ipcRenderer.removeListener(channel, func);
                }
            }
        }
    }
);