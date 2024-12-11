window.onload = () => {
  console.log("Hello World");

  // -----------------------------------
  // DOM Element References
  // -----------------------------------
  const audioMode = document.getElementById("audio-mode"); 
  const modeSwitch = document.getElementById("mode-switch"); 

  const audioFileInput = document.getElementById("audio-file"); 
  const playButton = document.getElementById("play-btn"); 
  const playButtonLabel = document.getElementById("play-btn-label"); 

  const sectionsSlider = document.getElementById("sections"); 
  const sectionsLabel = document.getElementById("sections-label"); 

  const songTitle = document.getElementById("song-title"); 
  const audioPlayer = document.getElementById("audio"); 
  const audioPlayerContainer = document.getElementById("audio-player-container"); 
  const seekSlider = document.getElementById("seek-slider"); 
  const currentTimeLabel = document.getElementById("current-time"); 
  const durationLabel = document.getElementById("duration"); 

  const volumeSlider = document.getElementById("volume-slider"); 
  const volumeSliderLabel = document.getElementById("volume-slider-label"); 

  const canvas = document.getElementById("canvas"); 
  const canvasCtx = canvas.getContext("2d");

  // -----------------------------------
  // State Variables
  // -----------------------------------
  let isSeeking = false;
  let audioFileVar = null;
  let audioContext = null;
  let analyser = null;
  let dataArray = null;
  let bufferLength = 0;
  let source = null;
  let micStream = null;
  let visualizationMode = "linear-spectrogram";

  // -----------------------------------
  // Canvas Setup
  // -----------------------------------
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  // -----------------------------------
  // Utility Functions
  // -----------------------------------
  function formatTime(time) {
    const minutes = Math.floor(time / 60);
    let seconds = Math.floor(time % 60);
    seconds = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutes}:${seconds}`;
  }

  function updateTimeLabels() {
    currentTimeLabel.innerText = formatTime(audioPlayer.currentTime);
    durationLabel.innerText = formatTime(audioPlayer.duration);
  }

  function initAnalyser(sourceNode) {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    analyser = audioContext.createAnalyser();
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 2 ** sectionsSlider.value;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }

  function renderVisualizationFrame() {
    requestAnimationFrame(renderVisualizationFrame);
    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    canvasCtx.fillStyle = "rgb(0, 0, 0)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    switch (visualizationMode) {
      case "linear-spectrogram":
        drawLinearSpectrogram();
        break;
      case "circular-spectrogram":
        // Placeholder
        break;
      case "waveform":
        // Placeholder
        break;
      default:
        drawLinearSpectrogram();
    }

    if (audioPlayer && audioPlayer.duration && audioMode.value !== "2") {
      if (!isSeeking) {
        seekSlider.value = (audioPlayer.currentTime / audioPlayer.duration) * 1000;
      }
      updateTimeLabels();
    }
  }

  function drawLinearSpectrogram() {
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (((dataArray[i] ** 1.5) / (255 ** 1.5)) * canvas.height) / 3;

      const r = barHeight + 25 * (i / bufferLength);
      const g = 255 * (i / bufferLength);
      const b = 50 + 10 * (i / bufferLength);

      canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      canvasCtx.fillRect(
        x,
        canvas.height / 2 - barHeight,
        barWidth,
        barHeight * 2
      );
      x += barWidth;
    }
  }

  // Placeholders for future modes
  function drawCircularSpectrogram() {}
  function drawWaveform() {}

  // -----------------------------------
  // Mode Handling
  // -----------------------------------
  function handleModeSwitch() {
    // If leaving microphone mode, stop mic stream and reset analyzer and source
    if (micStream && audioMode.value !== "2") {
      micStream.getTracks().forEach(track => track.stop());
      micStream = null;
      source = null;
      analyser = null;
    }

    switch (audioMode.value) {
      case "0":
        // Player mode: show audio player container
        audioPlayerContainer.classList.remove("hidden");
        break;
      case "1":
        // File mode: hide audio player container
        audioPlayerContainer.classList.add("hidden");
        break;
      case "2":
        // Microphone mode: hide player container, stop any current track
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        playButtonLabel.innerText = "Play";
        audioPlayerContainer.classList.add("hidden");
        startMicrophoneStream();
        break;
      default:
        console.warn("Unknown audio mode selected.");
    }
  }

  audioMode.addEventListener("change", handleModeSwitch);

  // -----------------------------------
  // Microphone Capture
  // -----------------------------------
  async function startMicrophoneStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStream = stream;
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      source = audioContext.createMediaStreamSource(stream);
      initAnalyser(source);
      renderVisualizationFrame();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }

  // -----------------------------------
  // File Input Handling
  // -----------------------------------
  audioFileInput.addEventListener("change", () => {
    audioFileVar = audioFileInput.files[0];
    if (audioFileVar) {
      audioPlayer.src = URL.createObjectURL(audioFileVar);
      songTitle.innerText = audioFileVar.name;
    }
  });

  // -----------------------------------
  // Playback Control
  // -----------------------------------
  playButton.addEventListener("click", () => {
    if (!audioPlayer) {
      console.error("No audio player available.");
      return;
    }

    // If microphone mode is active, we do not control the audio player
    if (audioMode.value === "2") {
      console.log("Microphone mode active; not playing file audio.");
      return;
    }

    if (audioPlayer.paused) {
      audioPlayer.play();
      fadeInAudio(audioPlayer);

      // Always re-initialize the analyser in non-mic modes to ensure it works
      if (!audioContext) {
        audioContext = new AudioContext();
      }
      source = audioContext.createMediaElementSource(audioPlayer);
      initAnalyser(source);
      renderVisualizationFrame();

      playButtonLabel.innerText = "Pause";
    } else {
      audioPlayer.pause();
      playButtonLabel.innerText = "Play";
    }
  });

  function fadeInAudio(player) {
    player.volume = 0;
    let volume = 0;
    const fadeInterval = setInterval(() => {
      if (volume < 1 && !player.paused) {
        volume += 0.01;
        player.volume = Math.min(volume, 1);
      } else {
        clearInterval(fadeInterval);
      }
    }, 10);
  }

  // -----------------------------------
  // Seek Handling
  // -----------------------------------
  seekSlider.addEventListener("mousedown", () => {
    isSeeking = true;
  });

  seekSlider.addEventListener("mouseup", () => {
    isSeeking = false;
    if (audioPlayer && audioPlayer.duration) {
      audioPlayer.currentTime = (seekSlider.value / 1000) * audioPlayer.duration;
    }
  });

  // -----------------------------------
  // Sections (FFT Size) Handling
  // -----------------------------------
  sectionsSlider.addEventListener("input", handleSectionsChange);

  function handleSectionsChange() {
    const fftSize = 2 ** sectionsSlider.value;
    sectionsLabel.innerText = `Sections: ${fftSize}`;
    if (analyser) {
      analyser.fftSize = fftSize;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }
  }

  // -----------------------------------
  // Volume Handling
  // -----------------------------------
  volumeSlider.addEventListener("input", () => {
    const volumeValue = volumeSlider.value;
    volumeSliderLabel.innerText = `Volume: ${volumeValue}%`;
    if (audioPlayer && audioMode.value !== "2") {
      audioPlayer.volume = volumeValue / 100;
    }
  });

  volumeSliderLabel.innerText = `Volume: ${volumeSlider.value}%`;

  // -----------------------------------
  // Initialization
  // -----------------------------------
  handleSectionsChange();
  handleModeSwitch();
};