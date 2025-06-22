import React, { useEffect, useState, useRef } from "react";
import "../styles/CricketScore.css";

const MATCH_TYPES = ["All", "T20", "ODI", "Test"];
const STATUS_FILTERS = ["Ongoing Matches", "Upcoming Matches"];
const SORT_OPTIONS = ["Latest First", "Oldest First"];

const ITEMS_PER_PAGE = 10;

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = new Date(targetDate) - now;
      if (diff <= 0) {
        setTimeLeft("Started");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span>{timeLeft}</span>;
};

const CricketScore = () => {
  const [data, setData] = useState([]);
  const [inputData, setInputData] = useState("");
  const [search, setSearch] = useState("");
  const [matchType, setMatchType] = useState("All");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState("");
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteMatches");
    return saved ? JSON.parse(saved) : [];
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return JSON.parse(saved);

    // Auto detect system preference on first load
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return true;
    }
    return false;
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [modalMatch, setModalMatch] = useState(null);
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const liveMatchIdsRef = useRef(new Set());

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(inputData.trim());
      setPage(1); // reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [inputData]);

  // Save favorites to localStorage on change
  useEffect(() => {
    localStorage.setItem("favoriteMatches", JSON.stringify(favorites));
  }, [favorites]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch data from API
  const getData = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError(null);
      const url = searchQuery
        ? `https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc&search=${encodeURIComponent(
            searchQuery
          )}`
        : `https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const result = await response.json();

      if (result?.data) {
        setData(result.data);
        setLastUpdated(new Date());
        notifyNewLiveMatches(result.data);
      } else {
        setData([]);
        setError("No data found.");
      }
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch scores. Please try again.");
      setLoading(false);
      console.error(err);
    }
  };

  // Notify new live matches
  const notifyNewLiveMatches = (matches) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    const currentLiveMatches = matches.filter(
      (m) => m.status && m.status !== "Match not started"
    );
    const previousLiveIds = liveMatchIdsRef.current;
    const currentLiveIds = new Set(currentLiveMatches.map((m) => m.id));

    currentLiveMatches.forEach((match) => {
      if (!previousLiveIds.has(match.id)) {
        new Notification("Match Started!", {
          body: `${match.series} - ${match.t1} vs ${match.t2}`,
          icon: match.t1img || "/favicon.ico",
        });
      }
    });

    liveMatchIdsRef.current = currentLiveIds;
  };

  // Auto refresh every 60 seconds
  useEffect(() => {
    getData(search);
    const interval = setInterval(() => {
      getData(search);
    }, 60000);
    return () => clearInterval(interval);
  }, [search]);

  // Filter matches by type & status
  const filteredByType = data.filter((match) => {
    if (matchType === "All") return true;
    return (
      match.matchType &&
      match.matchType.toLowerCase() === matchType.toLowerCase()
    );
  });

  const filteredByStatus = filteredByType.filter((match) => {
    if (statusFilter === "Ongoing Matches") {
      return match.status && match.status !== "Match not started";
    }
    if (statusFilter === "Upcoming Matches") {
      return match.status === "Match not started";
    }
    return true;
  });

  // Sort filtered data by date/time
  const sortedData = [...filteredByStatus].sort((a, b) => {
    const dateA = a.dateTimeGMT ? new Date(a.dateTimeGMT).getTime() : 0;
    const dateB = b.dateTimeGMT ? new Date(b.dateTimeGMT).getTime() : 0;
    if (sortOption === "Latest First") {
      return dateB - dateA;
    } else {
      return dateA - dateB;
    }
  });

  // Pagination / Infinite scroll data slice
  const pagedData = sortedData.slice(0, page * ITEMS_PER_PAGE);

  // Copy match info to clipboard
  const copyMatchToClipboard = async (match) => {
    try {
      const shareURL = `${window.location.origin}?matchId=${match.id}`;
      const textToCopy = `Match: ${match.series}\nType: ${match.matchType}\nTeams: ${match.t1} vs ${match.t2}\nStatus: ${match.status}\nLink: ${shareURL}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(`Copied match info of "${match.series}"!`);
      setTimeout(() => setCopySuccess(""), 3000);
    } catch {
      setCopySuccess("Failed to copy!");
      setTimeout(() => setCopySuccess(""), 3000);
    }
  };

  // Toggle favorite
  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((favId) => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  // Match status color
  const getStatusColor = (status) => {
    if (!status) return "gray";
    if (
      status.toLowerCase().includes("live") ||
      status.toLowerCase().includes("ongoing")
    )
      return "#00ff88"; // green
    if (status.toLowerCase().includes("match not started")) return "#aaa"; // gray
    if (
      status.toLowerCase().includes("won") ||
      status.toLowerCase().includes("draw")
    )
      return "#f44336"; // red
    return "white";
  };

  // Retry fetch on error
  const retryFetch = () => {
    getData(search);
  };

  // Format date nicely
  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString();
  };

  // Load more handler for infinite scroll
  const loadMore = () => {
    setPage((p) => p + 1);
  };

  // Accessibility: trap focus inside modal when open
  useEffect(() => {
    if (!modalMatch) return;

    const focusableElements = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const modal = document.getElementById("modal-content");
    const firstElement = modal.querySelectorAll(focusableElements)[0];
    const focusableContent = modal.querySelectorAll(focusableElements);
    const lastElement = focusableContent[focusableContent.length - 1];

    function handleKeyDown(e) {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      } else if (e.key === "Escape") {
        setModalMatch(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    firstElement.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalMatch]);

  return (
    <div className={`main-container ${darkMode ? "dark-mode" : ""}`}>
      <div className="animated-background"></div>

      <div
        className="top-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          className="heading"
          style={{ display: "flex", alignItems: "center", gap: "1rem" }}
        >
          <img src="/Circle/circle.jpg" alt="Logo" width="60" />
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>⚡️ Live Cricket Score</h1>
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            padding: "8px 15px",
            borderRadius: "30px",
            background: darkMode ? "#444" : "#ffd700",
            color: darkMode ? "white" : "black",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div
        className="searchBar"
        style={{
          marginBottom: 20,
          flexWrap: "wrap",
          display: "flex",
          gap: "12px",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search Series or Teams..."
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          style={{ flexGrow: 1, minWidth: 220, padding: "8px 12px", fontSize: "1rem" }}
          aria-label="Search series or teams"
        />

        <select
          value={matchType}
          onChange={(e) => {
            setMatchType(e.target.value);
            setPage(1);
          }}
          style={{ padding: "8px 12px", fontSize: "1rem" }}
          aria-label="Filter by Match Type"
        >
          {MATCH_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{ padding: "8px 12px", fontSize: "1rem" }}
          aria-label="Filter by Match Status"
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value);
            setPage(1);
          }}
          style={{ padding: "8px 12px", fontSize: "1rem" }}
          aria-label="Sort matches by date"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {lastUpdated && (
        <p
          style={{
            fontSize: "0.9rem",
            color: darkMode ? "#ccc" : "#555",
            marginBottom: 12,
          }}
        >
          Last updated: {formatDate(lastUpdated)}
        </p>
      )}

      {copySuccess && (
        <p
          style={{
            color: "#00ff88",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          {copySuccess}
        </p>
      )}

      {error && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <p style={{ color: "#f44336", fontWeight: "bold" }}>{error}</p>
          <button
            onClick={retryFetch}
            style={{
              padding: "8px 15px",
              borderRadius: "30px",
              background: "#ffd700",
              color: "black",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            aria-label="Retry fetching data"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="score-container">
          {[...Array(3)].map((_, i) => (
            <div className="card skeleton" key={i}>
              <div className="skeleton-title"></div>
              <div className="teams">
                <div>
                  <div className="skeleton-circle"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text small"></div>
                </div>
                <div>
                  <div className="skeleton-circle"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text small"></div>
                </div>
              </div>
              <div className="skeleton-status"></div>
            </div>
          ))}
        </div>
      ) : pagedData.length > 0 ? (
        <>
          <div className="score-container">
            {pagedData.map((match, i) => (
              <div
                className="card"
                key={i}
                style={{
                  animation: "fadeIn 0.4s ease",
                  transition: "transform 0.3s",
                }}
                tabIndex={0}
                aria-label={`Match: ${match.series}, ${match.t1} vs ${match.t2}`}
              >
                <h3>{match.series}</h3>
                <h4>{match.matchType}</h4>
                <div
                  className="teams"
                  style={{ justifyContent: "center", gap: "1rem" }}
                >
                  <div>
                    <img src={match.t1img} alt={match.t1} />
                    <p>{match.t1}</p>
                    {match.t1s && <p>{match.t1s}</p>}
                  </div>
                  <div>
                    <img src={match.t2img} alt={match.t2} />
                    <p>{match.t2}</p>
                    {match.t2s && <p>{match.t2s}</p>}
                  </div>
                </div>

                <p
                  className="status"
                  style={{
                    color: getStatusColor(match.status),
                    fontWeight: "bold",
                  }}
                >
                  {match.status}
                </p>

                {/* Countdown for upcoming matches */}
                {match.status === "Match not started" &&
                  match.dateTimeGMT && (
                    <p style={{ fontWeight: "bold", color: darkMode ? "#eee" : "#333" }}>
                      Starts in: <Countdown targetDate={match.dateTimeGMT} />
                    </p>
                  )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "12px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    onClick={() => copyMatchToClipboard(match)}
                    className="share-button"
                    aria-label={`Share match info for ${match.series}`}
                  >
                    Share
                  </button>

                  <button
                    onClick={() => toggleFavorite(match.id)}
                    aria-label={
                      favorites.includes(match.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    style={{
                      background: favorites.includes(match.id)
                        ? "#00ff88"
                        : "#444",
                      color: favorites.includes(match.id)
                        ? "black"
                        : "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {favorites.includes(match.id) ? "★ Favorited" : "☆ Favorite"}
                  </button>

                  <button
                    onClick={() => setModalMatch(match)}
                    aria-label={`View details for ${match.series}`}
                    style={{
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More button */}
          {pagedData.length < sortedData.length && (
            <div style={{ textAlign: "center", margin: "1rem 0" }}>
              <button
                onClick={loadMore}
                style={{
                  padding: "8px 20px",
                  borderRadius: "30px",
                  background: "#ffd700",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
                aria-label="Load more matches"
              >
                Load More
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="not-found">⚠️ No Matches Found!</p>
      )}

      {/* Modal for Match Details */}
      {modalMatch && (
        <div
          className="modal-overlay"
          onClick={() => setModalMatch(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") setModalMatch(null);
          }}
        >
          <div
            id="modal-content"
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 500,
              margin: "2rem auto",
              padding: 20,
              background: darkMode ? "#222" : "#fff",
              borderRadius: 15,
              color: darkMode ? "#eee" : "#000",
              animation: "fadeInScale 0.3s ease",
            }}
          >
            <h2 id="modal-title">{modalMatch.series}</h2>
            <p>
              <strong>Match Type:</strong> {modalMatch.matchType}
            </p>
            <p>
              <strong>Teams:</strong> {modalMatch.t1} vs {modalMatch.t2}
            </p>
            <p>
              <strong>Status:</strong> {modalMatch.status}
            </p>
            <p>
              <strong>Venue:</strong> {modalMatch.venue || "N/A"}
            </p>
            <p>
              <strong>Date & Time:</strong>{" "}
              {modalMatch.dateTimeGMT
                ? new Date(modalMatch.dateTimeGMT).toLocaleString()
                : "N/A"}
            </p>
            <p>
              <strong>Toss:</strong> {modalMatch.toss || "N/A"}
            </p>
            <button
              onClick={() => setModalMatch(null)}
              style={{
                marginTop: 20,
                padding: "8px 15px",
                borderRadius: "30px",
                background: "#ffd700",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                width: "100%",
              }}
              aria-label="Close details modal"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Animations styles (could be moved to CSS file) */}
      <style>{`
        @keyframes fadeIn {
          from {opacity: 0;}
          to {opacity: 1;}
        }
        @keyframes fadeInScale {
          0% {opacity: 0; transform: scale(0.8);}
          100% {opacity: 1; transform: scale(1);}
        }
        .card:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .modal-overlay {
          position: fixed;
          top:0; left:0; right:0; bottom:0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
      `}</style>
    </div>
  );
};

export default CricketScore;
