window.onload = () => {
  console.log("Hello World");

  const audioFile = document.getElementById("audio-file");
  const submitBtn = document.getElementById("submit-btn");
  const playBtn = document.getElementById("play-btn");
  let audioFileVar = null;
  let audioPlayer = null;

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

  submitBtn.addEventListener("click", () => {
    audioFileVar = audioFile.files[0];
    console.log(audioFileVar);

    // setup audio player and add it to DOM only if there is no audio player
    // if there is an audio player, just change the src
    if (document.querySelector("audio")) {
      document.querySelector("audio").src = URL.createObjectURL(audioFileVar);
      return;
    } else {
      audioPlayer = document.createElement("audio");
      audioPlayer.src = URL.createObjectURL(audioFileVar);
      audioPlayer.controls = true;
      document.body.appendChild(audioPlayer);
    }
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

        function renderFrame() {
          requestAnimationFrame(renderFrame);
          x = 0;
          analyser.getByteFrequencyData(dataArray);
          canvasCtx.fillStyle = "rgb(0, 0, 0)";
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < bufferLength; i++) {
            // set barHeight maximum to 100% of canvas height
            barHeight = ((dataArray[i]^1.5)/(255^1.5) * canvas.height)/3;
            console.log(barHeight);
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
        }

        renderFrame();
      } else {
        audioPlayer.pause();
      }
    } else {
      console.error("No audio file provided");
    }
  });
};
