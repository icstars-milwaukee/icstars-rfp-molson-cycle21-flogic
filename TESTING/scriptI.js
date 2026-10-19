// THE NANDO NOTES - scriptI.js
// Reads a selected CSV file and displays its content using the FileReader API.
//
// How it works, start to finish:
//   user picks a file -> "change" event fires -> FileReader reads the file as text
//   -> "onload" fires when reading is done -> the text gets put into the output box
//
// FileReader is built into the browser (no install needed). It reads files the user picks
// right on their own computer; nothing gets uploaded to a server.

// 1. Grabs the button and the output box using their IDs
//    (these match id="csvFileInput" and id="output" in testI.html)
//    "const" means these variables won't be reassigned to something else later.
const fileInput = document.getElementById('csvFileInput');
const outputBox = document.getElementById('output');

// 2. Waits for when a file is selected
//    addEventListener('change', ...) runs the function every time the chosen file changes.
//    "event" carries info about what happened, including which file(s) were picked.
fileInput.addEventListener('change', function (event) {
    // .files is a list of chosen files; [0] grabs the first one (this button only allows one)
    const file = event.target.files[0];
    if (!file) return; // Safety check for if user cancels (no file = stop here)

    // 3. Initializes FileReader API
    const reader = new FileReader();

    // 4. Tells it what to do when the file is finished reading
    //    Reading happens in the background (asynchronously), so we set this up BEFORE starting.
    //    e.target.result holds the file's full content as one big string of text.
    reader.onload = function (e) {
        // textContent (instead of innerHTML) shows the text as-is, so anything in the file
        // that looks like HTML code gets displayed as plain text instead of being run.
        outputBox.textContent = e.target.result; // Display text on the page
    };

    // 5. Executes the reader
    //    readAsText starts reading the file; when it finishes, the onload function above runs.
    reader.readAsText(file);
});
