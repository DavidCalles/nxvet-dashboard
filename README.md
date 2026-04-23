# NxVET Serverless Dashboard

A lightweight, serverless dashboard to view and manage your NxVET conversation data and labels. Built with vanilla HTML, JavaScript, and CSS, featuring a premium dark-mode aesthetic with glassmorphism elements.

## Features
- **Serverless Architecture**: Runs entirely in the browser using HTML/JS/CSS.
- **Local Proxy Server**: Includes a tiny Python proxy server to seamlessly bypass browser CORS (`file://`) restrictions.
- **Secure**: Your API key stays in your browser's local storage and is only ever sent directly to the NxVET API.
- **Real-Time Data**: Fetches the latest `AudioButtonRecording`, `NxMIC`, and `ClinicConversation` label data directly from your organization.
- **Rich Transcripts**: Formats clinical SOAP notes and raw transcripts into an easy-to-read view.

## Quick Start (Windows)

1. Clone this repository.
2. Double-click the `start_dashboard.bat` script.
3. The script will automatically launch the local proxy server and open `http://localhost:8000` in your default web browser.
4. Paste your `nxvet_sk_` API key into the dashboard to connect!

## Manual Start

If you prefer to run it manually (or are on macOS/Linux):
1. Open a terminal in the project directory.
2. Run `python server.py`.
3. Navigate to `http://localhost:8000` in your web browser.

## Tech Stack
- HTML5
- Vanilla JavaScript
- Vanilla CSS (No frameworks)
- Python 3 (For the local proxy server)
