window.onload = () => {
  // -----------------------------------
  // DOM Element References
  // -----------------------------------
  const header = document.getElementById("header");

  const hoverPreview = document.getElementById("hover-preview");

  const audioMode = document.getElementById("audio-mode");
  const modeSwitch = document.getElementById("mode-switch");

  const audioFileInput = document.getElementById("audio-file");
  const playButton = document.getElementById("play-btn");
  const playButtonLabel = document.getElementById("play-btn-label");

  const sectionsSlider = document.getElementById("range-slider");
  const sectionsLabel = document.getElementById("sections-label");

  const songTitle = document.getElementById("song-title");
  const audioPlayer = document.getElementById("audio");
  const audioPlayerContainer = document.getElementById(
    "audio-player-container"
  );
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
  let visualizationMode = modeSwitch.value;

  // -----------------------------------
  // Canvas Setup
  // -----------------------------------
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

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

  // -----------------------------------
  // Visualization Handling
  // -----------------------------------
  function renderVisualizationFrame() {
    requestAnimationFrame(renderVisualizationFrame);
    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    canvasCtx.fillStyle = "rgb(0, 0, 0)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    switch (visualizationMode) {
      case "0":
        drawLinearSpectrogram();
        break;
      case "1":
        drawCircularSpectrogram();
        break;
      case "2":
        drawPeakFrequencySpectrogram();
        break;
      default:
        drawLinearSpectrogram();
    }

    if (audioPlayer && audioPlayer.duration && audioMode.value !== "2") {
      if (!isSeeking) {
        seekSlider.value =
          (audioPlayer.currentTime / audioPlayer.duration) * 1000;
        updateTimeLabels();
      }
    }
  }

  modeSwitch.addEventListener("change", () => {
    visualizationMode = modeSwitch.value;
    console.log("visualization mode updated to", visualizationMode);
  });

  // Visualization modes: 0 = linear spectrogram, 1 = circular spectrogram, 2 = waveform

  function drawLinearSpectrogram() {
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = ((dataArray[i] ** 1.5 / 255 ** 1.5) * canvas.height) / 2;

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

  function drawCircularSpectrogram() {}

  function drawPeakFrequencySpectrogram() {
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) ** 6 * canvas.height;

      const r = barHeight + 25 * (i / bufferLength);
      const g = 250 * (i / bufferLength);
      const b = 50;

      canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth;
    }
  }

  // -----------------------------------
  // Mode Handling
  // -----------------------------------
  function handleModeSwitch() {
    // If leaving microphone mode, stop mic stream and reset analyzer and source
    if (micStream && audioMode.value !== "2") {
      micStream.getTracks().forEach((track) => track.stop());
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
        // Player mode: hide audio player container
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
        // default to player mode
        audioPlayerContainer.classList.remove("hidden");
    }
  }

  audioMode.addEventListener("change", handleModeSwitch);

  // -----------------------------------
  // Microphone Capture
  // -----------------------------------
  async function startMicrophoneStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
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
      audioPlayer.currentTime =
        (seekSlider.value / 1000) * audioPlayer.duration;
    }
  });

  // while seeking, update the time label
  seekSlider.addEventListener("input", () => {
    currentTimeLabel.innerText = formatTime(audioPlayer.duration)
      ? formatTime((seekSlider.value / 1000) * audioPlayer.duration)
      : "0:00";
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
    volumeSliderLabel.innerText = `Vol: ${volumeValue}%`;
    if (audioPlayer && audioMode.value !== "2") {
      audioPlayer.volume = volumeValue / 100;
    }
  });

  volumeSliderLabel.innerText = `Vol: ${volumeSlider.value}%`;

  // -----------------------------------
  // Hover Preview
  // -----------------------------------
  function hoverPrevewInit() {
    // Change inner text of hover preview depending on touch or mouse
    if ("ontouchstart" in window) {
      hoverPreview.innerText = "Tap anywhere to open menu";
    } else {
      hoverPreview.innerText = "Hover here to open menu";
    }
  }

  function hoverPreviewHandler() {
    // Delete the preview after 0.15s once it's been hovered for the first time
    setTimeout(() => {
      header.removeChild(hoverPreview);
    }, 150);
  }

  hoverPreview.addEventListener("mouseover", hoverPreviewHandler);
  document.addEventListener("touchstart", hoverPreviewHandler);

  // -----------------------------------
  // Mobile Event Listeners
  // -----------------------------------
  function headerTouchHandler() {
    // Toggle the header visibility on touch
    header.classList.toggle("active");
  }

  document.addEventListener("touchstart", headerTouchHandler); // Toggle the header visibility on touch
  canvas.addEventListener("touchmove", (e) => e.preventDefault()); // Prevent the default touchmove behavior on the canvas

  // -----------------------------------
  // Initialization
  // -----------------------------------
  handleSectionsChange();
  handleModeSwitch();
  hoverPrevewInit();
};
