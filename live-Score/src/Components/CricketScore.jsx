import React, { useEffect, useState, useRef } from "react";
import "../styles/CricketScore.css";

const MATCH_TYPES = ["All", "T20", "ODI", "Test"];

const CricketScore = () => {
  const [data, setData] = useState([]);
  const [inputData, setInputData] = useState("");
  const [search, setSearch] = useState("");
  const [matchType, setMatchType] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState("");

  // Track live match IDs for notification
  const liveMatchIdsRef = useRef(new Set());

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(inputData.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [inputData]);

  // Request Notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch data function
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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (result?.data) {
        setData(result.data);
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

  // Notification for new live matches
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

  // Filter matches by matchType
  const filteredData = data.filter((match) => {
    if (matchType === "All") return true;
    return (
      match.matchType &&
      match.matchType.toLowerCase() === matchType.toLowerCase()
    );
  });

  const liveMatches = filteredData.filter(
    (match) => match.status && match.status !== "Match not started"
  );
  const upcomingMatches = filteredData.filter(
    (match) => match.status === "Match not started"
  );

  // Copy current URL to clipboard
  const copyToClipboard = async () => {
    try {
      const textToCopy = window.location.href;
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess("Copied to clipboard!");
      setTimeout(() => setCopySuccess(""), 3000);
    } catch (err) {
      setCopySuccess("Failed to copy!");
      setTimeout(() => setCopySuccess(""), 3000);
    }
  };

  return (
    <div className="main-container">
      <div className="animated-background"></div>

      <div className="heading">
        <img src="/Circle/circle.jpg" alt="Logo" width="300" />
        <h1>⚡️ Live Cricket Score</h1>
      </div>

      <div className="searchBar" style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Search Series or Teams..."
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          style={{ marginRight: 12, padding: "8px 12px", fontSize: "1rem" }}
        />

        <select
          value={matchType}
          onChange={(e) => setMatchType(e.target.value)}
          style={{ padding: "8px 12px", fontSize: "1rem" }}
          aria-label="Filter by Match Type"
        >
          {MATCH_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          onClick={copyToClipboard}
          style={{
            marginLeft: "1rem",
            padding: "8px 15px",
            borderRadius: "30px",
            background: "#ffd700",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          title="Share / Copy URL"
        >
          Share
        </button>
      </div>

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

      {error && <p className="error">{error}</p>}

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
      ) : (
        <>
          <section className="match-section">
            <h2>Live / Ongoing Matches</h2>
            {liveMatches.length > 0 ? (
              <div className="score-container">
                {liveMatches.map((match, i) => (
                  <div className="card" key={i}>
                    <h3>{match.series}</h3>
                    <h4>{match.matchType}</h4>
                    <div className="teams">
                      <div>
                        <img src={match.t1img} alt={match.t1} />
                        <p>{match.t1}</p>
                        <p>{match.t1s}</p>
                      </div>
                      <div>
                        <img src={match.t2img} alt={match.t2} />
                        <p>{match.t2}</p>
                        <p>{match.t2s}</p>
                      </div>
                    </div>
                    <p className="status">{match.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="not-found">No live matches currently.</p>
            )}
          </section>

          <section className="match-section">
            <h2>Upcoming Matches</h2>
            {upcomingMatches.length > 0 ? (
              <div className="score-container">
                {upcomingMatches.map((match, i) => (
                  <div className="card upcoming" key={i}>
                    <h3>{match.series}</h3>
                    <h4>{match.matchType}</h4>
                    <div className="teams">
                      <div>
                        <img src={match.t1img} alt={match.t1} />
                        <p>{match.t1}</p>
                      </div>
                      <div>
                        <img src={match.t2img} alt={match.t2} />
                        <p>{match.t2}</p>
                      </div>
                    </div>
                    <p className="status">{match.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="not-found">No upcoming matches found.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default CricketScore;
