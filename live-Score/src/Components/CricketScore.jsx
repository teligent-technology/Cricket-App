import React, { useEffect, useState, useRef } from "react";
import "../styles/CricketScore.css";

const MATCH_TYPES = ["All", "T20", "ODI", "Test"];
const DATE_FILTERS = ["All", "Today", "Ongoing", "Completed"];

const formatDate = (date) => date.toISOString().split("T")[0];

const CricketScore = () => {
  // States
  const [data, setData] = useState([]);
  const [debouncedInput, setDebouncedInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [bookmarks, setBookmarks] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState(null);
  const [modalMatch, setModalMatch] = useState(null);

  // Refs
  const prevMatchIds = useRef(new Set());
  const scoreContainerRef = useRef(null);

  // Load localStorage data on mount
  useEffect(() => {
    const savedBookmarks = JSON.parse(localStorage.getItem("bookmarkedMatches") || "[]");
    setBookmarks(savedBookmarks);

    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.body.classList.add("dark-mode");

    const savedFilterType = localStorage.getItem("filterType");
    if (savedFilterType) setFilterType(savedFilterType);

    const savedDateFilter = localStorage.getItem("dateFilter");
    if (savedDateFilter) setDateFilter(savedDateFilter);

    const savedData = localStorage.getItem("cachedScoreData");
    if (savedData) setData(JSON.parse(savedData));
  }, []);

  // Save bookmarks
  useEffect(() => {
    localStorage.setItem("bookmarkedMatches", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Save dark mode & toggle body class
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
  }, [darkMode]);

  // Save filters
  useEffect(() => {
    localStorage.setItem("filterType", filterType);
  }, [filterType]);

  useEffect(() => {
    localStorage.setItem("dateFilter", dateFilter);
  }, [dateFilter]);

  // Online/offline detection
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

  // Notification permission request on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(debouncedInput.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [debouncedInput]);

  // Fetch data
  const getData = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError(null);
      const url = searchQuery
        ? `https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc&search=${encodeURIComponent(searchQuery)}`
        : `https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();

      // Notifications for new matches starting
      if (result.data) {
        result.data.forEach((match) => {
          if (
            match.status &&
            !prevMatchIds.current.has(match.id) &&
            match.status.toLowerCase().includes("started")
          ) {
            if (Notification.permission === "granted") {
              new Notification(`Match Started: ${match.t1} vs ${match.t2}`);
            }
          }
        });
        prevMatchIds.current = new Set(result.data.map((m) => m.id));
      }

      setData(result.data || []);
      localStorage.setItem("cachedScoreData", JSON.stringify(result.data || []));
      setLoading(false);
    } catch (err) {
      setError(err.message || "Unknown error");
      setLoading(false);
    }
  };

  // Initial fetch and on search change
  useEffect(() => {
    getData(search);
  }, [search]);

  // Auto refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => getData(search), 60000);
    return () => clearInterval(interval);
  }, [search]);

  // Filter matches by type & date
  const filteredData = data.filter((match) => {
    if (filterType !== "All" && match.matchType?.toLowerCase() !== filterType.toLowerCase()) {
      return false;
    }
    if (dateFilter === "Today") {
      const today = formatDate(new Date());
      if (!match.date || match.date.slice(0, 10) !== today) return false;
    } else if (dateFilter === "Ongoing") {
      if (!match.status?.toLowerCase().includes("started") && !match.status?.toLowerCase().includes("live")) return false;
    } else if (dateFilter === "Completed") {
      if (!match.status?.toLowerCase().includes("won") && !match.status?.toLowerCase().includes("drawn") && !match.status?.toLowerCase().includes("completed")) return false;
    }
    return true;
  });

  // Autocomplete suggestions from current data
  const suggestions = Array.from(
    new Set(data.flatMap((m) => [m.series, m.t1, m.t2].filter(Boolean).map((s) => s.toLowerCase())))
  );

  // Toggle bookmark
  const toggleBookmark = (match) => {
    const exists = bookmarks.find((b) => b.id === match.id);
    if (exists) {
      setBookmarks(bookmarks.filter((b) => b.id !== match.id));
    } else {
      setBookmarks([...bookmarks, match]);
    }
  };

  // Share match info to clipboard
  const shareMatch = (match) => {
    const shareText = `Live Cricket Score:\n${match.series}\n${match.t1} vs ${match.t2}\nStatus: ${match.status}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => alert("Match info copied to clipboard!"));
    } else {
      alert("Clipboard not supported");
    }
  };

  // Auto-scroll to first ongoing match
  useEffect(() => {
    if (scoreContainerRef.current) {
      const ongoingIdx = filteredData.findIndex((m) =>
        m.status?.toLowerCase().includes("started") || m.status?.toLowerCase().includes("live")
      );
      if (ongoingIdx >= 0) {
        const cards = scoreContainerRef.current.querySelectorAll(".card");
        if (cards[ongoingIdx]) {
          cards[ongoingIdx].scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [filteredData]);

  return (
    <div className="main-container" role="main">
      {isOffline && (
        <div className="offline-warning" role="alert">
          ⚠️ You are offline. Check your connection.
        </div>
      )}

      <header className="top-bar" role="region" aria-label="Search and filters">
        <div className="searchBar">
          <input
            type="text"
            placeholder="🔍 Search Series or Teams..."
            value={debouncedInput}
            list="search-suggestions"
            onChange={(e) => setDebouncedInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(debouncedInput.trim())}
            aria-label="Search Series or Teams"
            autoComplete="off"
          />
          <datalist id="search-suggestions">
            {suggestions.map((s, i) => (
              <option key={i} value={s} />
            ))}
          </datalist>
          <button onClick={() => setSearch(debouncedInput.trim())} aria-label="Search">
            GO
          </button>
        </div>

        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          aria-label="Filter by match type"
        >
          {MATCH_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="Filter by date"
        >
          {DATE_FILTERS.map((type) => (
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
      </header>

      <div className="heading" aria-label="App Title and Logo">
        <img src="/Circle/circle.jpg" alt="App Logo" />
        <h1 tabIndex={0}>⚡️ Live Cricket Score</h1>
      </div>

      {error && (
        <div className="error-message" role="alert">
          ⚠️ Error: {error}
        </div>
      )}

      {loading ? (
        <div className="loader-skeleton-container" aria-busy="true" aria-live="polite">
          {[...Array(6)].map((_, i) => (
            <div className="card-skeleton" key={i} />
          ))}
        </div>
      ) : (
        <>
          {filteredData.length > 0 ? (
            <main className="score-container" ref={scoreContainerRef}>
              {filteredData.map(
                (match) =>
                  match.status !== "Match not started" && (
                    <article
                      className="card"
                      key={match.id}
                      tabIndex={0}
                      aria-label={`Match between ${match.t1} and ${match.t2}, status: ${match.status}`}
                      onClick={() => setModalMatch(match)}
                      onKeyDown={(e) => e.key === "Enter" && setModalMatch(match)}
                      role="button"
                    >
                      <div className="card-header">
                        <h3>{match.series}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(match);
                          }}
                          className={`bookmark-btn ${
                            bookmarks.find((b) => b.id === match.id) ? "bookmarked" : ""
                          }`}
                          title={
                            bookmarks.find((b) => b.id === match.id)
                              ? "Remove Bookmark"
                              : "Add Bookmark"
                          }
                          aria-pressed={bookmarks.find((b) => b.id === match.id) ? "true" : "false"}
                          aria-label={
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
                            width={60}
                            height={60}
                          />
                          <p>{match.t1}</p>
                          <p>{match.t1s}</p>
                        </div>
                        <div>
                          <img
                            src={match.t2img || "/default-team.png"}
                            alt={match.t2}
                            loading="lazy"
                            width={60}
                            height={60}
                          />
                          <p>{match.t2}</p>
                          <p>{match.t2s}</p>
                        </div>
                      </div>
                      <p className="status">{match.status}</p>
                      <button
                        className="share-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareMatch(match);
                        }}
                        aria-label={`Share match ${match.t1} vs ${match.t2}`}
                      >
                        🔗 Share
                      </button>
                    </article>
                  )
              )}
            </main>
          ) : (
            <p className="not-found" tabIndex={0}>
              ⚠️ No Matches Found!
            </p>
          )}

          {/* Bookmarked Matches Section */}
          {bookmarks.length > 0 && (
            <>
              <h2 className="bookmark-title" tabIndex={0}>
                ⭐ Bookmarked Matches
              </h2>
              <section className="score-container">
                {bookmarks.map((match) => (
                  <article className="card bookmarked" key={`bm-${match.id}`}>
                    <div className="card-header">
                      <h3>{match.series}</h3>
                      <button
                        onClick={() => toggleBookmark(match)}
                        className="bookmark-btn bookmarked"
                        title="Remove Bookmark"
                        aria-label="Remove Bookmark"
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
                          width={60}
                          height={60}
                        />
                        <p>{match.t1}</p>
                        <p>{match.t1s}</p>
                      </div>
                      <div>
                        <img
                          src={match.t2img || "/default-team.png"}
                          alt={match.t2}
                          loading="lazy"
                          width={60}
                          height={60}
                        />
                        <p>{match.t2}</p>
                        <p>{match.t2s}</p>
                      </div>
                    </div>
                    <p className="status">{match.status}</p>
                    <button
                      className="share-btn"
                      onClick={() => shareMatch(match)}
                      aria-label={`Share bookmarked match ${match.t1} vs ${match.t2}`}
                    >
                      🔗 Share
                    </button>
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      )}

      {/* Modal for detailed match info */}
      {modalMatch && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalTitle"
          tabIndex={-1}
          onClick={() => setModalMatch(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setModalMatch(null);
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            tabIndex={0}
          >
            <button
              className="modal-close"
              onClick={() => setModalMatch(null)}
              aria-label="Close detailed match view"
            >
              &times;
            </button>
            <h2 id="modalTitle">{modalMatch.series} - {modalMatch.matchType}</h2>
            <h3>{modalMatch.t1} vs {modalMatch.t2}</h3>
            <p><strong>Status:</strong> {modalMatch.status}</p>
            <div className="teams">
              <div>
                <img
                  src={modalMatch.t1img || "/default-team.png"}
                  alt={modalMatch.t1}
                  width={80}
                  height={80}
                />
                <p>{modalMatch.t1}</p>
                <p><strong>Score:</strong> {modalMatch.t1s || "N/A"}</p>
              </div>
              <div>
                <img
                  src={modalMatch.t2img || "/default-team.png"}
                  alt={modalMatch.t2}
                  width={80}
                  height={80}
                />
                <p>{modalMatch.t2}</p>
                <p><strong>Score:</strong> {modalMatch.t2s || "N/A"}</p>
              </div>
            </div>

            <p><em>More detailed match info coming soon...</em></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CricketScore;
