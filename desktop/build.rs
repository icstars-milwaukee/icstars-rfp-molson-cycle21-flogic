// Before Tauri packs the pages into the exe:  copy them into desktop/dist/,  and add the title bar.
//
//   staff:  dist/DIRECTORY/...                      (only the app)
//   IT:     dist/DIRECTORY/...  +  dist/it-console/...   (the console uses the app's core files)
//   both:   dist/titlebar/   (the window's own top bar:  titlebarI.css + titlebarI.js)
//
// The repo's pages are NOT changed.   Only the copies get two extra lines in <head>,  and the console's
// security rule  (connect-src 'none')  lets Tauri's own window calls through  (ipc:,  http://ipc.localhost).

use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    let here = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let repo = here.parent().unwrap().to_path_buf();
    let it = std::env::var("CARGO_FEATURE_IT").is_ok();
    let dist = here.join("dist");

    let _ = fs::remove_dir_all(&dist);
    copy_dir(&repo.join("DIRECTORY"), &dist.join("DIRECTORY"));
    if it {
        copy_dir(&repo.join("it-console"), &dist.join("it-console"));
    }
    copy_dir(&here.join("titlebar"), &dist.join("titlebar"));
    // The webview asks for /favicon.ico by itself:  without one,  every start logs a failed request
    fs::copy(here.join("icons/icon.ico"), dist.join("favicon.ico")).unwrap();

    for page in ["DIRECTORY/testI.html", "it-console/it-console.html"] {
        let p = dist.join(page);
        if p.exists() {
            let html = fs::read_to_string(&p).unwrap();
            fs::write(&p, dress(&html)).unwrap();
        }
    }

    let trust = fs::read_to_string(repo.join("DIRECTORY/it-signerI.js")).unwrap_or_default();
    if trust.contains("FLOGIC_IT_SIGNER = null") {
        println!("cargo:warning=DIRECTORY/it-signerI.js is the blank trust file: key-file sign-in will be off in this build.");
    }

    println!("cargo:rerun-if-changed=../DIRECTORY");
    println!("cargo:rerun-if-changed=../it-console");
    println!("cargo:rerun-if-changed=titlebar");
    println!("cargo:rerun-if-env-changed=CARGO_FEATURE_IT");

    tauri_build::build();
}

// The two lines,  just before </head>,  and the console's connect-src
fn dress(html: &str) -> String {
    let add = "    <link rel=\"stylesheet\" href=\"../titlebar/titlebarI.css\">\r\n    <script src=\"../titlebar/titlebarI.js\" defer></script>\r\n</head>";
    html.replacen("</head>", add, 1)
        .replace("connect-src 'none'", "connect-src ipc: http://ipc.localhost")
}

fn copy_dir(from: &Path, to: &Path) {
    fs::create_dir_all(to).unwrap();
    for entry in fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_dir() {
            copy_dir(&path, &to.join(entry.file_name()));
        } else {
            fs::copy(&path, to.join(entry.file_name())).unwrap();
        }
    }
}
