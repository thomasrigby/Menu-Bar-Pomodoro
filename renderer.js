window.addEventListener('DOMContentLoaded', () => {
  // Get all elements we need
  const focusSection = document.getElementById('focus-section');
  const breakSection = document.getElementById('break-section');
  const focusDigits = Array.from(document.querySelector('#focus-time').getElementsByClassName('digit-box'));
  const breakDigits = Array.from(document.querySelector('#break-time').getElementsByClassName('digit-box'));
  const startButton = document.getElementById('start-focus');
  const resetButton = document.getElementById('reset-timer');
  const volumeIcon = document.getElementById('volume-icon');
  const timerSound = document.getElementById('timer-sound');
  const focusProgressRing = focusSection.querySelector('.progress-ring-circle');
  const breakProgressRing = breakSection.querySelector('.progress-ring-circle');

  let timerInterval;
  let isRunning = false;
  let isFocusTime = true;
  let savedFocusTime = 40 * 60; // Store initial focus time in seconds (40 minutes)
  let savedBreakTime = 5 * 60;  // Store initial break time in seconds
  let isMuted = false;
  let currentSessionStart = null;
  let currentSessionData = {
    startTime: null,
    focusDuration: 0,
    breakDuration: 0,
    completed: false
  };

  // Calculate the circumference of the circle
  const radius = 45;
  const circumference = radius * 2 * Math.PI;
  
  // Set initial dasharray
  focusProgressRing.style.strokeDasharray = `${circumference} ${circumference}`;
  breakProgressRing.style.strokeDasharray = `${circumference} ${circumference}`;
  focusProgressRing.style.strokeDashoffset = '0';
  breakProgressRing.style.strokeDashoffset = '0';

  // Function to save timer state
  function saveTimerState() {
    localStorage.setItem('timerState', JSON.stringify({
      isFocusTime,
      isRunning,
      savedFocusTime,
      savedBreakTime,
      currentSessionData
    }));
  }

  // Function to restore timer state
  function restoreTimerState() {
    const savedState = localStorage.getItem('timerState');
    if (savedState) {
      const state = JSON.parse(savedState);
      // Always start in focus mode when first loading
      isFocusTime = true;
      isRunning = false; // Always start paused when restoring
      savedFocusTime = state.savedFocusTime;
      savedBreakTime = state.savedBreakTime;
      currentSessionData = state.currentSessionData || {
        startTime: null,
        focusDuration: 0,
        breakDuration: 0,
        completed: false
      };

      // Always start with focus UI
      startButton.dataset.mode = 'focus';
      switchTimerSection(false);
      focusSection.style.opacity = '1';
      focusSection.style.visibility = 'visible';
      breakSection.style.opacity = '0';
      breakSection.style.visibility = 'hidden';
      
      updateDigitBoxes(focusDigits, savedFocusTime);
      updateDigitBoxes(breakDigits, savedBreakTime);
    }
  }

  // Restore state when page loads
  restoreTimerState();

  // Function to start a new session
  function startNewSession(isBreak) {
    const now = new Date();
    now.setHours(now.getHours() + 8); // Add 8 hours for UTC+8
    currentSessionData = {
      startTime: now.toISOString(),
      duration: getTimeFromDigits(isBreak ? breakDigits : focusDigits),
      sessionType: isBreak ? 'break' : 'focus',
      completed: false
    };
  }

  // Function to complete a Pomodoro session
  async function completeSession(wasCompleted = true) {
    if (currentSessionData.startTime) {
      // Update the session data with current state
      currentSessionData.completed = wasCompleted;
      currentSessionData.sessionType = isFocusTime ? 'focus' : 'break';
      currentSessionData.duration = getTimeFromDigits(isFocusTime ? focusDigits : breakDigits);
      
      try {
        await window.electron.ipcRenderer.invoke('log-pomodoro-session', currentSessionData);
      } catch (error) {
        console.error('Error logging session:', error);
      }
    }
  }

  // Function to switch timer sections
  function switchTimerSection(toBreak) {
    if (toBreak) {
      focusSection.classList.add('hidden');
      breakSection.classList.remove('hidden');
      breakSection.style.opacity = '1';
      breakSection.style.visibility = 'visible';
      focusSection.style.opacity = '0';
      focusSection.style.visibility = 'hidden';
      startButton.dataset.mode = 'break';
    } else {
      breakSection.classList.add('hidden');
      focusSection.classList.remove('hidden');
      focusSection.style.opacity = '1';
      focusSection.style.visibility = 'visible';
      breakSection.style.opacity = '0';
      breakSection.style.visibility = 'hidden';
      startButton.dataset.mode = 'focus';
    }
    saveTimerState();
  }

  // Function to set progress
  function setProgress(circle, percent) {
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
  }

  // Function to get time from digit boxes (returns seconds)
  function getTimeFromDigits(digits) {
    const minutes = parseInt(digits[0].value + digits[1].value);
    const seconds = parseInt(digits[2].value + digits[3].value);
    return (minutes * 60) + seconds;
  }

  // Function to update digit boxes with time
  function updateDigitBoxes(digits, timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    
    // Update minutes
    digits[0].value = Math.floor(minutes / 10);
    digits[1].value = minutes % 10;
    
    // Update seconds
    digits[2].value = Math.floor(seconds / 10);
    digits[3].value = seconds % 10;
  }

  // Function to run timer
  function runTimer(initialTime) {
    const currentDigits = isFocusTime ? focusDigits : breakDigits;
    const currentProgressRing = isFocusTime ? focusProgressRing : breakProgressRing;
    let timeLeft = getTimeFromDigits(currentDigits);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      playTimerEndSound();
      
      // Complete the current session with the current mode type
      completeSession(true);

      // Switch to the opposite timer mode
      isFocusTime = !isFocusTime;
      startButton.dataset.mode = isFocusTime ? 'focus' : 'break';
      startButton.dataset.playing = "false";
      
      // Enable the appropriate digit inputs and reset the other timer
      if (isFocusTime) {
        focusDigits.forEach(digit => digit.disabled = false);
        updateDigitBoxes(breakDigits, savedBreakTime);
        setProgress(breakProgressRing, 100);
      } else {
        breakDigits.forEach(digit => digit.disabled = false);
        updateDigitBoxes(focusDigits, savedFocusTime);
        setProgress(focusProgressRing, 100);
      }

      // Switch the display
      switchTimerSection(!isFocusTime);
      
      // Start a new session for the next timer
      startNewSession(!isFocusTime);
      saveTimerState();
      return;
    }

    timeLeft--;
    updateDigitBoxes(currentDigits, timeLeft);
    
    // Calculate how much of circle to remove per tick
    const portionPerTick = 100 / initialTime;
    const remainingPortions = timeLeft * portionPerTick;
    setProgress(currentProgressRing, remainingPortions);
  }

  // Function to start timer (either focus or break)
  function startTimer(isBreak = false) {
    if (isRunning) return;

    isRunning = true;
    isFocusTime = !isBreak;
    
    // Start new session with the current mode type
    startNewSession(isBreak);

    // Set initial time and progress when starting
    const currentDigits = isBreak ? breakDigits : focusDigits;
    const currentProgressRing = isBreak ? breakProgressRing : focusProgressRing;
    const initialTime = getTimeFromDigits(currentDigits);
    
    // Set full circle at start
    setProgress(currentProgressRing, 100);
    
    // Disable all digit inputs while timer is running
    [...focusDigits, ...breakDigits].forEach(digit => digit.disabled = true);
    
    startButton.dataset.playing = "true";
    timerInterval = setInterval(() => runTimer(initialTime), 1000);
  }

  // Start button click handler
  startButton.addEventListener('click', () => {
    if (isRunning) {
      // If timer is running, pause it and log as incomplete
      clearInterval(timerInterval);
      isRunning = false;
      startButton.dataset.playing = "false";
      completeSession(false);
      [...focusDigits, ...breakDigits].forEach(digit => digit.disabled = false);
      return;
    }

    // Save the current time as the total time for this session
    if (isFocusTime) {
      savedFocusTime = getTimeFromDigits(focusDigits);
    } else {
      savedBreakTime = getTimeFromDigits(breakDigits);
    }

    // If timer is not running, start it
    startTimer(!isFocusTime);
  });

  // Reset button click handler
  resetButton.addEventListener('click', () => {
    if (isRunning) {
      clearInterval(timerInterval);
      isRunning = false;
      startButton.dataset.playing = "false";
      completeSession(false);
    }

    // Always switch to focus mode
    isFocusTime = true;
    startButton.dataset.mode = 'focus';
    
    // Reset both timers to their saved values
    updateDigitBoxes(focusDigits, savedFocusTime);
    updateDigitBoxes(breakDigits, savedBreakTime);
    
    // Reset progress rings
    setProgress(focusProgressRing, 100);
    setProgress(breakProgressRing, 100);
    
    // Enable all digit inputs
    [...focusDigits, ...breakDigits].forEach(digit => digit.disabled = false);
    
    // Switch to focus section
    switchTimerSection(false);
    
    // Save the state
    saveTimerState();
  });

  // Input validation for digit boxes
  [...focusDigits, ...breakDigits].forEach(digit => {
    // Only allow numbers
    digit.addEventListener('keypress', (e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });

    // Handle paste events
    digit.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      if (/^\d$/.test(pastedText)) {
        digit.value = pastedText;
      }
    });

    // Handle input changes
    digit.addEventListener('input', () => {
      // Remove any non-numeric characters
      digit.value = digit.value.replace(/[^\d]/g, '');

      // Handle empty value
      if (digit.value === '') {
        digit.value = '0';
      }

      if (digit.value.length > 1) {
        digit.value = digit.value.slice(-1);
      }
      
      const isMinutes = focusDigits.indexOf(digit) <= 1 || breakDigits.indexOf(digit) <= 1;
      const maxVal = isMinutes ? 9 : (digit.value === '6' ? 5 : 9);
      
      if (parseInt(digit.value) > maxVal) {
        digit.value = maxVal;
      }

      // Update saved times when input changes
      if (isFocusTime) {
        savedFocusTime = getTimeFromDigits(focusDigits);
      } else {
        savedBreakTime = getTimeFromDigits(breakDigits);
      }
    });

    // Handle blur (when input loses focus)
    digit.addEventListener('blur', () => {
      if (digit.value === '') {
        digit.value = '0';
      }
    });
  });

  // Volume toggle functionality
  volumeIcon.addEventListener('click', () => {
    isMuted = !isMuted;
    volumeIcon.src = isMuted ? 'images/volume_off.png' : 'images/volume_on.png';
    volumeIcon.classList.toggle('muted', isMuted);
  });

  // Function to play sound
  function playTimerEndSound() {
    if (!isMuted && timerSound) {
      timerSound.currentTime = 0;
      timerSound.play().catch(error => console.log('Error playing sound:', error));
    }
  }

  // Initialize progress rings
  setProgress(focusProgressRing, 100);
  setProgress(breakProgressRing, 100);
});