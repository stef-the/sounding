window.onload = () => {
  console.log("Hello World");

  const audioFile = document.getElementById("audio-file"); // audio file input element
  const playBtn = document.getElementById("play-btn"); // play button element
  const playBtnLabel = document.getElementById("play-btn-label"); // play button label element
  const sections = document.getElementById("sections"); // sections slider element
  const sectionsLabel = document.getElementById("sections-label"); // sections slider label element
  let audioFileVar = null;
  const songTitle = document.getElementById("song-title"); // song title element
  const audioPlayer = document.getElementById("audio"); // audio player element
  const seekSlider = document.getElementById("seek-slider"); // seek slider element
  const volumeSlider = document.getElementById("volume-slider"); // volume slider element
  const currentTime = document.getElementById("current-time"); // current time element
  const duration = document.getElementById("duration"); // duration element

  let isSeeking = false; // seeking state

  // prep canvas for visualizer
  const canvas = document.getElementById("canvas");
  const canvasCtx = canvas.getContext("2d");

  // setup canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  // event listeners

  audioFile.addEventListener("change", () => {
    audioFileVar = audioFile.files[0];
    console.log(audioFileVar);
    document.getElementById("audio").src = URL.createObjectURL(audioFileVar);

    // set song title to audio file name
    songTitle.innerText = audioFileVar.name;
  });

  // add event listeners to seek slider to set isSeeking state
  seekSlider.addEventListener("mousedown", () => {
    isSeeking = true;
  });

  seekSlider.addEventListener("mouseup", () => {
    isSeeking = false;
    // set audio player current time to seek slider value
    audioPlayer.currentTime = (seekSlider.value / 1000) * audioPlayer.duration;
  });

  /*
  // add event listener to volume slider to change audio volume
  volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });
  */

  // add event listener to play button to play audio and start visualizer
  playBtn.addEventListener("click", () => {
    if (audioPlayer) {
      if (audioPlayer.paused) {
        // play audio
        audioPlayer.play();

        // fade in audio volume
        audioPlayer.volume = 0;
        let volume = 0;
        const fadeAudio = setInterval(() => {
          if (volume < 1 && !audioPlayer.paused) {
            volume += 0.01;
            audioPlayer.volume = volume;
          } else {
            clearInterval(fadeAudio);
            if (audioPlayer.paused) {
              audioPlayer.volume = 0;
            } else {
              audioPlayer.volume = 1;
            }
          }
        }, 10);

        // split audio frequency into 32 bands
        const audioContext = new AudioContext();
        let analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        // dynamically set size to sections slider value
        analyser.fftSize = 2 ** sections.value;
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
            barHeight =
              (((dataArray[i] ^ 1.5) / (255 ^ 1.5)) * canvas.height) / 3;
            const r = barHeight + 25 * (i / bufferLength);
            const g = 255 * (i / bufferLength);
            const b = (50 + 10 * (i / bufferLength)) ^ 2;
            canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
            // make max barheight equal to max canvas height
            canvasCtx.fillRect(
              x,
              canvas.height / 2 - barHeight,
              barWidth,
              barHeight * 2
            );
            x += barWidth;
          }

          // update seek slider value
          if (!isSeeking) {
            seekSlider.value =
              (audioPlayer.currentTime / audioPlayer.duration) * 1000;
          }

          // update current time and duration
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

  // add event listener to slider to change fftSize
  // and update slider label
  sections.addEventListener("input", () => {
    document.getElementById("sections-label").innerText = `Sections: ${
      2 ** sections.value
    }`;
  });

  // set sections slider span to initial value
  console.log(sections.value)
  sectionsLabel.innerText = `Sections: ${
    2 ** sections.value
  }`;
};

// format time function
function formatTime(time) {
  const minutes = Math.floor(time / 60);
  let seconds = Math.floor(time % 60);
  seconds = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${seconds}`;
}
