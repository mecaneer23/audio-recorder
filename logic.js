const button = document.querySelector(".button");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");


function main() {
    if (!navigator.mediaDevices.getUserMedia) {
        alert("MediaDevices.getUserMedia() not supported on your browser!");
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(onSuccess, (err) => {
        console.log("The following error occured: " + err);
    });
}

let mediaRecorder = Object.create(null);
let chunks = [];

function draw() { }

function onSuccess(stream) {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = function (e) {
        chunks.push(e.data);
    };
    const audioCtx = new AudioContext();
    mediaRecorder.onstop = stopRecording;
    const source = audioCtx.createMediaStreamSource(stream);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    source.connect(analyser);

    draw = function () {
        const canvasCtx = canvas.getContext("2d");

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;

        if (mediaRecorder.state == "recording") {
            requestAnimationFrame(draw);
        }

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
}

function toggleRecording() {
    if (mediaRecorder.state != "recording") {
        mediaRecorder.start();
        button.style.background = "red";
        button.innerHTML = "Stop";
        draw();
        return;
    }
    button.innerHTML = "Record";
    mediaRecorder.stop();
    button.style.background = "";
};

function stopRecording() {
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
    const audioSource = document.createElement("source");
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
    chunks = [];
    audioSource.src = window.URL.createObjectURL(blob);
    audio.appendChild(audioSource);
    clipContainer.appendChild(audio);

    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = "Delete";
    deleteButton.onclick = function (e) {
        if (confirm(`Are you sure you want to delete ${clipLabel.innerHTML}?`)) {
            e.target.parentNode.parentNode.removeChild(e.target.parentNode);
        }
    };
    clipContainer.appendChild(deleteButton);

    const renameButton = document.createElement("button");
    renameButton.innerHTML = "Rename";
    renameButton.onclick = function () {
        const newClipName = prompt(`Rename ${clipLabel.innerHTML}`);
        if (newClipName !== null) {
            clipLabel.innerHTML = newClipName;
        }
    };
    clipContainer.appendChild(renameButton);

    soundClips.appendChild(clipContainer);
};

main();
