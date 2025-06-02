# Tomodoro - Menu Bar Pomodoro Timer

A sleek and minimal Pomodoro timer that lives in your menu bar, helping you stay focused and productive.

## Features

- Menu bar integration for easy access
- Focus and break timer functionality
- Statistics tracking with beautiful graphs
- Daily, weekly, monthly, and yearly views
- Local data storage
- Native notifications
- Sound alerts

## Installation

### For Users
Download the latest release for your platform and unzip the file. On macOS, you might need to right-click and select "Open" the first time you run the app.

### For Developers
1. Clone the repository:
```bash
git clone [your-repo-url]
cd tomodoro
```

2. Install dependencies:
```bash
npm install
```

3. Start the app:
```bash
npm start
```

## Building from Source

To create a distributable version:
```bash
npm run make
```

The packaged app will be available in the `out/make` directory.

## Tech Stack

- Electron
- Node.js
- SQLite3
- Chart.js

## License

ISC 