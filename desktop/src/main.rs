// Flogic's window.   No frame of Windows' own:  the page draws its own top bar  (desktop/titlebar/).
// The window stays hidden until the page has loaded,  so there's no white flash.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, webview::PageLoadEvent};

#[cfg(not(feature = "it"))]
const PAGE: &str = "DIRECTORY/testI.html";
#[cfg(not(feature = "it"))]
const TITLE: &str = "Flogic";
#[cfg(not(feature = "it"))]
const ROLE: &str = "staff";

#[cfg(feature = "it")]
const PAGE: &str = "it-console/it-console.html";
#[cfg(feature = "it")]
const TITLE: &str = "Flogic IT";
#[cfg(feature = "it")]
const ROLE: &str = "it";

// Tauri's own WebView2 flags  (setting any flag replaces them,  so they're repeated here)
const WEBVIEW_FLAGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

// TEST BUILDS ONLY  (cargo build --features sweep):  open the page to Chrome's DevTools protocol on a local port
// (FLOGIC_SWEEP_PORT,  default 9334),  so a test can drive and profile the REAL window.
// Never in a build people get:  any program on the computer could read the page,  unlocked keys included.
#[cfg(feature = "sweep")]
fn webview_flags() -> String {
    let port = std::env::var("FLOGIC_SWEEP_PORT").unwrap_or_else(|_| "9334".into());
    format!("{WEBVIEW_FLAGS} --remote-debugging-port={port}")
}
#[cfg(not(feature = "sweep"))]
fn webview_flags() -> String {
    WEBVIEW_FLAGS.into()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Each app keeps its own browser storage  (the staff app and IT's console never share it)
            let data = app.path().app_local_data_dir()?.join(ROLE);
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App(PAGE.into()))
                .additional_browser_args(&webview_flags())
                .title(TITLE)
                .inner_size(1280.0, 860.0)
                .min_inner_size(720.0, 520.0)
                .center()
                .decorations(false)
                .shadow(true)
                .visible(false)
                .data_directory(data)
                .on_page_load(|w, p| {
                    if p.event() == PageLoadEvent::Finished {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Flogic couldn't start");
}
