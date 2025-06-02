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

### Prerequisites
- Node.js (Download from [nodejs.org](https://nodejs.org))
- Git
- For macOS users:
  ```bash
  # Install Xcode Command Line Tools
  xcode-select --install
  ```

### For Users
Download the latest release for your platform and unzip the file. On macOS, you might need to right-click and select "Open" the first time you run the app.

### For Developers
1. Clone the repository:
```bash
git clone https://github.com/thomasrigby/Menu-Bar-Pomodoro.git
cd Menu-Bar-Pomodoro
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

The packaged app will be available in:
- macOS ARM (M1/M2): `out/make/zip/darwin-arm64/`
- macOS Intel: `out/make/zip/darwin-x64/`
- Windows: `out/make/squirrel.windows/x64/`
- Linux: `out/make/deb/x64/` or `out/make/rpm/x64/`

### Troubleshooting

If you encounter "no developer tools found" on macOS:
1. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
2. Wait for the installation to complete
3. Try building again:
   ```bash
   npm run make
   ```

## Tech Stack

- Electron
- Node.js
- SQLite3
- Chart.js

## License

ISC 