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
                    'log-pomodoro-session'
                ];
                if (validChannels.includes(channel)) {
                    return ipcRenderer.invoke(channel, data);
                }
                return Promise.reject(new Error('Invalid channel'));
            }
        }
    }
);