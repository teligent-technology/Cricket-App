import React, { useEffect, useState, useRef } from "react";
import "../styles/CricketScore.css";

const MATCH_TYPES = ["All", "T20", "ODI", "Test"];

const CricketScore = () => {
  const [data, setData] = useState([]);
  const [inputData, setInputData] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [bookmarks, setBookmarks] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const prevMatchIds = useRef(new Set());

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("bookmarkedMatches") || "[]");
    setBookmarks(saved);
  }, []);

  // Save bookmarks whenever changed
  useEffect(() => {
    localStorage.setItem("bookmarkedMatches", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Dark mode toggle (also set body class)
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // Fetch data function
  const getData = async (searchQuery = "") => {
    try {
      setLoading(true);
      const url = searchQuery
        ? `https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc&search=${searchQuery}`
        : "https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc";

      const response = await fetch(url);
      const result = await response.json();

      // Notify for new matches starting
      if (result.data) {
        result.data.forEach((match) => {
          if (
            match.status &&
            !prevMatchIds.current.has(match.id) &&
            match.status.toLowerCase().includes("started")
          ) {
            // Show notification if permission granted
            if (Notification.permission === "granted") {
              new Notification(`Match Started: ${match.t1} vs ${match.t2}`);
            }
          }
        });
        prevMatchIds.current = new Set(result.data.map((m) => m.id));
      }

      setData(result.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Initial fetch & on search change
  useEffect(() => {
    getData(search);
  }, [search]);

  // Auto refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => getData(search), 60000);
    return () => clearInterval(interval);
  }, [search]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Add or remove bookmark
  const toggleBookmark = (match) => {
    const exists = bookmarks.find((b) => b.id === match.id);
    if (exists) {
      setBookmarks(bookmarks.filter((b) => b.id !== match.id));
    } else {
      setBookmarks([...bookmarks, match]);
    }
  };

  // Filter data by matchType
  const filteredData =
    filterType === "All"
      ? data
      : data.filter(
          (match) =>
            match.matchType &&
            match.matchType.toLowerCase() === filterType.toLowerCase()
        );

  // Search autocomplete suggestions from current data
  const suggestions = [
    ...new Set(
      data
        .flatMap((m) => [m.series, m.t1, m.t2])
        .filter(Boolean)
        .map((s) => s.toLowerCase())
    ),
  ];

  return (
    <div className="main-container">
      {isOffline && (
        <div className="offline-warning">⚠️ You are offline. Check your connection.</div>
      )}

      <div className="top-bar">
        <div className="searchBar">
          <input
            type="text"
            placeholder="🔍 Search Series or Teams..."
            value={inputData}
            list="search-suggestions"
            onChange={(e) => setInputData(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(inputData)}
          />
          <datalist id="search-suggestions">
            {suggestions.map((s, i) => (
              <option key={i} value={s} />
            ))}
          </datalist>
          <button onClick={() => setSearch(inputData)}>GO</button>
        </div>

        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          {MATCH_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          className="dark-mode-toggle"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      <div className="heading">
        <img src="/Circle/circle.jpg" alt="Logo" />
        <h1>⚡️ Live Cricket Score</h1>
      </div>

      {loading ? (
        <div className="loader-skeleton-container">
          {[...Array(6)].map((_, i) => (
            <div className="card-skeleton" key={i}></div>
          ))}
        </div>
      ) : (
        <>
          {filteredData.length > 0 ? (
            <div className="score-container">
              {filteredData.map(
                (match) =>
                  match.status !== "Match not started" && (
                    <div className="card" key={match.id}>
                      <div className="card-header">
                        <h3>{match.series}</h3>
                        <button
                          onClick={() => toggleBookmark(match)}
                          className={`bookmark-btn ${
                            bookmarks.find((b) => b.id === match.id)
                              ? "bookmarked"
                              : ""
                          }`}
                          title={
                            bookmarks.find((b) => b.id === match.id)
                              ? "Remove Bookmark"
                              : "Add Bookmark"
                          }
                        >
                          {bookmarks.find((b) => b.id === match.id) ? "★" : "☆"}
                        </button>
                      </div>
                      <h4>{match.matchType}</h4>
                      <div className="teams">
                        <div>
                          <img
                            src={match.t1img || "/default-team.png"}
                            alt={match.t1}
                            loading="lazy"
                          />
                          <p>{match.t1}</p>
                          <p>{match.t1s}</p>
                        </div>
                        <div>
                          <img
                            src={match.t2img || "/default-team.png"}
                            alt={match.t2}
                            loading="lazy"
                          />
                          <p>{match.t2}</p>
                          <p>{match.t2s}</p>
                        </div>
                      </div>
                      <p className="status">{match.status}</p>
                    </div>
                  )
              )}
            </div>
          ) : (
            <p className="not-found">⚠️ No Matches Found!</p>
          )}

          {/* Show bookmarked matches if any */}
          {bookmarks.length > 0 && (
            <>
              <h2 className="bookmark-title">⭐ Bookmarked Matches</h2>
              <div className="score-container">
                {bookmarks.map((match) => (
                  <div className="card" key={`bm-${match.id}`}>
                    <div className="card-header">
                      <h3>{match.series}</h3>
                      <button
                        onClick={() => toggleBookmark(match)}
                        className="bookmark-btn bookmarked"
                        title="Remove Bookmark"
                      >
                        ★
                      </button>
                    </div>
                    <h4>{match.matchType}</h4>
                    <div className="teams">
                      <div>
                        <img
                          src={match.t1img || "/default-team.png"}
                          alt={match.t1}
                          loading="lazy"
                        />
                        <p>{match.t1}</p>
                        <p>{match.t1s}</p>
                      </div>
                      <div>
                        <img
                          src={match.t2img || "/default-team.png"}
                          alt={match.t2}
                          loading="lazy"
                        />
                        <p>{match.t2}</p>
                        <p>{match.t2s}</p>
                      </div>
                    </div>
                    <p className="status">{match.status}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CricketScore;
