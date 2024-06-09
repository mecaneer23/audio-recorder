const button = document.querySelector(".button");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");

let audioRecorder;

function onSuccess(stream) {
    window.audioRecorder = {}
    window.audioRecorder.stream = stream;
    window.audioRecorder.mediaRecorder = new MediaRecorder(window.audioRecorder.stream);
    window.audioRecorder.chunks = [];
    window.audioRecorder.audioCtx = new AudioContext();
    window.audioRecorder.source = window.audioRecorder.audioCtx.createMediaStreamSource(window.audioRecorder.stream);
    startRecording();
}

function isRecording() {
    return window.audioRecorder.mediaRecorder.state == "recording";
}

function startRecording() {
    window.audioRecorder.mediaRecorder.ondataavailable = (e) => {
        window.audioRecorder.chunks.push(e.data);
    };
    window.audioRecorder.mediaRecorder.onstop = stopRecording;
    window.audioRecorder.mediaRecorder.start();
    button.style.background = "red";
    button.innerHTML = "Stop";

    const analyser = window.audioRecorder.audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    window.audioRecorder.source.connect(analyser);

    const draw = () => {
        const canvasCtx = canvas.getContext("2d");

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;

        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = "rgb(200, 200, 200)";
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "rgb(0, 0, 0)";

        canvasCtx.beginPath();

        let sliceWidth = (WIDTH * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0;
            let y = (v * HEIGHT) / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }

    draw();
}

function stopRecording() {
    button.innerHTML = "Record";
    button.style.background = "";

    const defaultClipName = `Untitled (${soundClips.childElementCount})`;

    const clipName = prompt(
        "Enter a name for your sound clip",
        defaultClipName,
    );

    const clipContainer = document.createElement("div");

    const clipLabel = document.createElement("p");
    clipLabel.innerHTML = clipName === null ? defaultClipName : clipName;
    clipContainer.appendChild(clipLabel);

    const audio = document.createElement("audio");
    audio.setAttribute("controls", "");
    audio.setAttribute("preload", "auto");
    audio.setAttribute("title", clipName);
    const audioSource = document.createElement("source");
    const blob = new Blob(window.audioRecorder.chunks, { type: "audio/mpeg" });
    window.audioRecorder.chunks = [];
    const recordedMediaURL = window.URL.createObjectURL(blob);
    audioSource.src = recordedMediaURL;
    audio.appendChild(audioSource);
    clipContainer.appendChild(audio);

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("audio-button");
    deleteButton.innerHTML = "Delete";
    deleteButton.onclick = function (e) {
        if (confirm(`Are you sure you want to delete ${clipLabel.innerHTML}?`)) {
            e.target.parentNode.parentNode.removeChild(e.target.parentNode);
        }
    };
    clipContainer.appendChild(deleteButton);

    const renameButton = document.createElement("button");
    renameButton.classList.add("audio-button");
    renameButton.innerHTML = "Rename";
    renameButton.onclick = function () {
        const newClipName = prompt(`Rename ${clipLabel.innerHTML}`);
        if (newClipName !== null) {
            clipLabel.innerHTML = newClipName;
            downloadButton.download = newClipName;
            audio.setAttribute("title", newClipName);
        }
    };
    clipContainer.appendChild(renameButton);

    const downloadButton = document.createElement("a");
    downloadButton.classList.add("audio-button");
    downloadButton.innerHTML = "Download";
    downloadButton.onclick = () => {
        URL.revokeObjectURL(audio);
    }
    downloadButton.href = recordedMediaURL;
    downloadButton.download = clipName;
    clipContainer.appendChild(downloadButton);

    soundClips.appendChild(clipContainer);

    window.audioRecorder.stream.getTracks().forEach(track => {
        track.stop();
    })
    window.audioRecorder.audioCtx.close();
    window.audioRecorder.source.disconnect();
};

if (!navigator.mediaDevices.getUserMedia) {
    alert("MediaDevices.getUserMedia() not supported on your browser!");
}

function toggleRecording() {
    if (!window.audioRecorder || !isRecording()) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(onSuccess, () => {
            alert("Microphone access must be enabled");
        });
        return;
    }
    window.audioRecorder.mediaRecorder.stop();
};
