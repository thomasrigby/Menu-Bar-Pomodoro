const { app, ipcMain, Notification } = require('electron')
const { menubar } = require('menubar')
const path = require('path')
const DBManager = require('./db-manager')

let db;
let timerInterval;
let currentTimer = {
  isRunning: false,
  timeLeft: 0,
  initialTime: 0,
  isFocusTime: true
};

// Set the application icon
if (process.platform === 'darwin') {
  app.dock.setIcon(path.join(__dirname, 'images', 'icon.png'))
}
// Hide the dock icon on macOS
if (process.platform === 'darwin') {
  app.dock.hide()
}

// Initialize database when app is ready
app.whenReady().then(() => {
  db = new DBManager();
});

const iconPath = path.join(__dirname, 'images', 'play@2x.png'); // macOS example

const mb = menubar({
  index: `file://${path.join(__dirname, 'index.html')}`,
  icon: iconPath,
  browserWindow: {
    width: 300,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    resizable: false,
    showDockIcon: false,
    skipTaskbar: true
  }
});

// Function to convert seconds to minutes
function secondsToMinutes(seconds) {
  if (!seconds || isNaN(seconds)) return 0;
  return Math.round(seconds / 60);
}

// Function to show notification
function showTimerCompleteNotification(isFocusTime) {
  const title = isFocusTime ? 'Focus Time Complete!' : 'Break Time Complete!';
  const body = isFocusTime ? 'Time for a break!' : 'Ready to focus?';
  
  new Notification({
    title: title,
    body: body,
    silent: true // We'll handle the sound separately
  }).show();

  // Send message to renderer to play sound
  mb.window.webContents.send('play-sound');
}

// Timer management functions
function startTimer(initialTime, isFocusTime) {
  clearInterval(timerInterval);
  currentTimer = {
    isRunning: true,
    timeLeft: initialTime,
    initialTime,
    isFocusTime
  };
  
  timerInterval = setInterval(() => {
    if (currentTimer.timeLeft <= 0) {
      clearInterval(timerInterval);
      currentTimer.isRunning = false;
      showTimerCompleteNotification(currentTimer.isFocusTime);
      mb.window.webContents.send('timer-complete', currentTimer);
    } else {
      currentTimer.timeLeft--;
      mb.window.webContents.send('timer-tick', currentTimer);
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  currentTimer.isRunning = false;
  mb.window.webContents.send('timer-paused', currentTimer);
}

// IPC handlers
ipcMain.handle('start-timer', async (event, { initialTime, isFocusTime }) => {
  startTimer(initialTime, isFocusTime);
  return currentTimer;
});

ipcMain.handle('pause-timer', async () => {
  pauseTimer();
  return currentTimer;
});

ipcMain.handle('get-timer-state', async () => {
  return currentTimer;
});

// Get graph data from database
async function getGraphData(timeRange, timeType = 'focus') {
  let data;
  let labels = [];
  let times = [];
  let sessions = [];
  let summary = {
    totalTime: 0,
    avgSession: 0,
    totalSessions: 0,
    completionRate: 0,
    sessions: []
  };

  try {
    switch (timeRange) {
      case 'today': {
        data = await db.getSessionsByHour(timeType);
        
        // Only use hours that have data
        data.forEach(row => {
          const hour = parseInt(row.hour);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const formattedHour = hour % 12 || 12;
          labels.push(`${formattedHour}${ampm}`);
          times.push(secondsToMinutes(row.total_time || 0));
          sessions.push(row.total_sessions);
        });
        break;
      }

      case 'week': {
        data = await db.getSessionsByDay(timeType);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayData = Array(7).fill({ 
          total_time: 0,
          total_sessions: 0, 
          completed_sessions: 0 
        });

        // Fill in actual data
        data.forEach(row => {
          const date = new Date(row.day);
          dayData[date.getDay()] = row;
        });

        // Use all days for weekly view
        labels = days;
        times = dayData.map(d => secondsToMinutes(d.total_time || 0));
        sessions = dayData.map(d => d.total_sessions || 0);
        break;
      }

      case 'month': {
        data = await db.getSessionsByMonth(timeType);
        
        // Only use days that have data
        data.forEach(row => {
          labels.push(row.day);
          times.push(secondsToMinutes(row.total_time || 0));
          sessions.push(row.total_sessions);
        });
        break;
      }

      case 'ytd': {
        data = await db.getSessionsByYear(timeType);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Only use months that have data
        data.forEach(row => {
          const monthIndex = parseInt(row.month) - 1;
          labels.push(months[monthIndex]);
          times.push(secondsToMinutes(row.total_time || 0));
          sessions.push(row.total_sessions);
        });
        break;
      }
    }

    // Calculate summary statistics from the actual data
    const totalTime = data.reduce((sum, row) => sum + (row.total_time || 0), 0);
    const totalSessions = data.reduce((sum, row) => sum + (row.total_sessions || 0), 0);
    const completedSessions = data.reduce((sum, row) => sum + (row.completed_sessions || 0), 0);

    summary = {
      totalTime: secondsToMinutes(totalTime),
      avgSession: totalSessions ? Math.round(totalTime / totalSessions / 60) : 0,
      totalSessions: totalSessions,
      completionRate: totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0,
      sessions: sessions
    };

  } catch (error) {
    console.error('Error getting graph data:', error);
    // Return empty data on error
    labels = [];
    times = [];
    sessions = [];
  }

  return {
    labels,
    times,
    summary
  };
}

// IPC handlers
ipcMain.handle('get-graph-data', async (event, { timeRange, timeType }) => {
  return getGraphData(timeRange, timeType);
});

ipcMain.handle('log-pomodoro-session', async (event, sessionData) => {
  try {
    const id = await db.addSession(sessionData);
    return { success: true, id };
  } catch (error) {
    console.error('Error logging session:', error);
    return { success: false, error: error.message };
  }
});

// Handle errors
mb.app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit()
  }
})

// Handle any unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
})

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
})