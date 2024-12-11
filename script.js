window.onload = () => {
  console.log("Hello World");

  const audioFile = document.getElementById("audio-file");
  const playBtn = document.getElementById("play-btn");
  const playBtnLabel = document.getElementById("play-btn-label");
  let audioFileVar = null;
  const audioPlayer = document.getElementById("audio"); // audio player element
  const seekSlider = document.getElementById("seek-slider"); // seek slider element
  const volumeSlider = document.getElementById("volume-slider"); // volume slider element
  const currentTime = document.getElementById("current-time"); // current time element
  const duration = document.getElementById("duration"); // duration element

  // prep canvas for visualizer
  const canvas = document.getElementById("canvas");
  const canvasCtx = canvas.getContext("2d");

  // setup canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  // setup extra audio context variables
  const slider = document.getElementById("sections");

  // event listeners

  audioFile.addEventListener("change", () => {
    audioFileVar = audioFile.files[0];
    console.log(audioFileVar);
    document.getElementById("audio").src = URL.createObjectURL(audioFileVar);
  });

  playBtn.addEventListener("click", () => {
    if (audioPlayer) {
      if (audioPlayer.paused) {
        audioPlayer.play();

        // split audio frequency into 32 bands
        const audioContext = new AudioContext();
        let analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        // dynamically set size to sections slider value
        analyser.fftSize = 2**slider.value;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        // render frame of animation
        function renderFrame() {
          requestAnimationFrame(renderFrame);
          x = 0;
          analyser.getByteFrequencyData(dataArray);
          canvasCtx.fillStyle = "rgb(0, 0, 0)";
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < bufferLength; i++) {
            // set barHeight maximum to 100% of canvas height
            barHeight = ((dataArray[i]^1.5)/(255^1.5) * canvas.height)/3;
            const r = barHeight + 25 * (i / bufferLength);
            const g = 250 * (i / bufferLength);
            const b = 50 + 10 * (i / bufferLength);
            canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
            // make max barheight equal to max canvas height
            canvasCtx.fillRect(
              x,
              canvas.height/2-barHeight,
              barWidth,
              barHeight*2
            );
            x += barWidth;
          }

          // update seek slider
          seekSlider.value = audioPlayer.currentTime / audioPlayer.duration * 1000;
          currentTime.innerText = formatTime(audioPlayer.currentTime);
          duration.innerText = formatTime(audioPlayer.duration);

        }

        // start animation
        renderFrame();

        // change button label text
        playBtnLabel.innerText = "Pause";
      } else {
        audioPlayer.pause();

        // change button label text
        playBtnLabel.innerText = "Play";
      }
    } else {
      console.error("No audio file provided");
    }
  });

  // set slider label value to slider value
  document.getElementById("sections-label").innerText = `Sections: ${2**slider.value}`;

  // add event listener to slider to change fftSize
  // and update slider label
  slider.addEventListener("input", () => {
    document.getElementById("sections-label").innerText = `Sections: ${2**slider.value}`;
  });
};

// format time function
function formatTime(time) {
  const minutes = Math.floor(time / 60);
  let seconds = Math.floor(time % 60);
  seconds = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${seconds}`;
}
