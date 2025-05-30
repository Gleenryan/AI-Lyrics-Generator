import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [audioURL, setAudioURL] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef();
  const lyricsContainerRef = useRef();

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioURL(url);

      // Show loading message
      setLoading(true);

      // Upload the file to the backend
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(
          "http://localhost:5000/api/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        const srtFile = response.data.srt_file; // The filename returned from the backend
        await fetchSRTFile(srtFile); // Fetch SRT file using the filename
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  };

  const fetchSRTFile = async (srtFile) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/srt/${srtFile}`, // Fetch the SRT file from the backend
        { responseType: "text" }
      );
      const srtData = response.data;

      const parsedSubtitles = parseSRT(srtData); // Parse the SRT data into a usable format
      setSubtitles(parsedSubtitles); // Set parsed subtitles in the state
      setLoading(false); // Hide loading message once the subtitles are fetched
    } catch (error) {
      console.error("Error fetching SRT file:", error);
    }
  };

  const parseSRT = (data) => {
    const lines = data.split(/\r?\n/);
    const entries = [];
    let i = 0;

    while (i < lines.length) {
      if (!lines[i].trim()) {
        i++;
        continue;
      }

      i++;
      const timeLine = lines[i++];
      const [start, end] = timeLine.split(" --> ").map(parseTime);
      let text = "";

      while (lines[i] && lines[i].trim()) {
        text += lines[i++] + "\n";
      }

      entries.push({ start, end, text: text.trim() });
      i++;
    }

    return entries;
  };

  const parseTime = (timeStr) => {
    const [h, m, s] = timeStr.replace(",", ".").split(":");
    return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
  };

  const handleTimeUpdate = () => {
    const currentTime = audioRef.current.currentTime;
    const index = subtitles.findIndex(
      (sub) => currentTime >= sub.start && currentTime <= sub.end
    );
    if (index !== -1 && index !== currentIndex) {
      setCurrentIndex(index); // Update the active subtitle index
    }
  };

  // Function to handle clicks on subtitle lines
  const handleClick = (index) => {
    const targetTime = subtitles[index].start;
    audioRef.current.currentTime = targetTime; // Jump to the corresponding time in the audio
    setCurrentIndex(index); // Update the active subtitle index
  };

  // Auto-scroll function to bring the current subtitle into view
  useEffect(() => {
    if (lyricsContainerRef.current && currentIndex !== -1) {
      const currentSubtitleElement =
        lyricsContainerRef.current.children[currentIndex];
      if (currentSubtitleElement) {
        currentSubtitleElement.scrollIntoView({
          behavior: "smooth",
          block: "center", // Centers the active subtitle in the container
        });
      }
    }
  }, [currentIndex]); // Runs whenever the currentIndex changes

  // Play audio automatically when subtitles are ready
  useEffect(() => {
    if (!loading && audioRef.current && audioURL) {
      audioRef.current.play(); // Start playing the audio once subtitles are loaded
    }
  }, [loading, audioURL]); // Runs when loading or audioURL changes

  return (
    <div className="container">
      <h1 style={{ color: "#00ffe0", textAlign: "center" }}>
        🎶 AI Generated Lyrics Karaoke (Like Spotify Lyrics)
      </h1>

      <input
        className="upload-button"
        type="file"
        accept="audio/*"
        onChange={handleAudioUpload}
      />
      {loading && <p style={{ color: "#888" }}>🎧 Processing your file...</p>}

      {audioURL && (
        <div style={{ marginTop: "20px" }}>
          <audio
            controls
            src={audioURL}
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: "100%",
              backgroundColor: "#121212",
              borderTop: "1px solid #333",
              zIndex: 999,
              margin: 0,
              padding: 0,
              height: "48px",
            }}
          />
        </div>
      )}

      <div ref={lyricsContainerRef} className="lyrics-container">
        {subtitles.length === 0 ? (
          <p style={{ color: "#888" }}>
            🎧 Welcome, please wait a little bit after inserting a song
          </p>
        ) : (
          subtitles.map((sub, i) => {
            const isActive = i === currentIndex;
            const isVisible = Math.abs(i - currentIndex) <= 2;

            return (
              <div
                key={i}
                className={`lyric-line ${isActive ? "active" : ""}`}
                onClick={() => handleClick(i)} // Add the click handler
                style={{
                  margin: "16px 0",
                  opacity: isVisible ? 1 : 0.15,
                  fontWeight: isActive ? "bold" : "normal",
                  fontSize: isActive ? "34px" : "26px",
                  color: isActive ? "#00ffe0" : "#aaa",
                  cursor: "pointer", // Change the cursor to indicate clickability
                  transition: "all 0.15s ease-in-out",
                }}
              >
                {sub.text}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;
